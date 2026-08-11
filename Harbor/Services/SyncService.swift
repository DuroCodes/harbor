import Foundation
import SwiftData

@MainActor
@Observable
final class SyncService {
    private(set) var isSyncing = false
    private(set) var lastError: String?
    private(set) var lastSyncAt: Date?

    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    private var proxy: any PlaidProxying { PlaidProxyClient() }

    var canSyncWithPlaid: Bool { proxy.isConfigured }

    func connect(publicToken: String, institutionName: String?, institutionID: String?) async throws {
        let response = try await proxy.exchangePublicToken(
            ExchangePublicTokenRequest(
                publicToken: publicToken,
                institutionName: institutionName,
                institutionID: institutionID
            )
        )

        try CategorySeeder.seedDefaults(into: modelContext)

        let institution = Institution(
            plaidItemID: response.itemID,
            name: institutionName ?? "Connected Institution",
            lastSyncedAt: nil
        )
        modelContext.insert(institution)

        for dto in response.accounts {
            let account = Account(
                plaidAccountID: dto.accountID,
                name: dto.name,
                officialName: dto.officialName,
                kind: PlaidMapper.accountKind(from: dto.type),
                subtype: PlaidMapper.accountSubtype(from: dto.subtype),
                mask: dto.mask,
                currencyCode: dto.balances.isoCurrencyCode ?? "USD",
                currentBalance: PlaidMapper.decimal(from: dto.balances.current),
                availableBalance: dto.balances.available.map { Decimal($0) },
                creditLimit: dto.balances.limit.map { Decimal($0) },
                institution: institution
            )
            modelContext.insert(account)
        }

        let cursor = SyncCursor(plaidItemID: response.itemID)
        modelContext.insert(cursor)
        try modelContext.save()

        try await sync(itemID: response.itemID)
    }

    func refreshAll() async {
        guard !isSyncing else { return }
        isSyncing = true
        lastError = nil
        defer { isSyncing = false }

        do {
            try CategorySeeder.seedDefaults(into: modelContext)
            try DemoDataPurger.removeIfPresent(into: modelContext)

            let accounts = try modelContext.fetch(
                FetchDescriptor<Account>(predicate: #Predicate { $0.isActive && !$0.isHidden })
            )
            let summary = FinancialCalculator.netWorth(
                accounts: accounts.map {
                    AccountBalanceInput(group: $0.group, currentBalance: $0.currentBalance, isActive: $0.isActive)
                }
            )
            try NetWorthSnapshotHousekeeping.resetIfStale(
                into: modelContext,
                currentNetWorth: summary.netWorth
            )

            let institutions = try modelContext.fetch(
                FetchDescriptor<Institution>(predicate: #Predicate { $0.isActive })
            )

            if proxy.isConfigured {
                for institution in institutions {
                    try await sync(itemID: institution.plaidItemID)
                }
            }

            try recordNetWorthSnapshot()
            lastSyncAt = .now
        } catch {
            lastError = error.localizedDescription
        }
    }

    /// Removes a Plaid Item from the proxy (when configured) and deletes local institution data.
    func unlink(institution: Institution) async throws {
        let itemID = institution.plaidItemID

        if proxy.isConfigured {
            try await proxy.removeItem(RemoveItemRequest(itemID: itemID))
        }

        let cursors = try modelContext.fetch(
            FetchDescriptor<SyncCursor>(predicate: #Predicate { $0.plaidItemID == itemID })
        )
        for cursor in cursors {
            modelContext.delete(cursor)
        }

        modelContext.delete(institution)
        try modelContext.save()
        try recordNetWorthSnapshot()
    }

    private func sync(itemID: String) async throws {
        let institutions = try modelContext.fetch(
            FetchDescriptor<Institution>(predicate: #Predicate { $0.plaidItemID == itemID })
        )
        guard let institution = institutions.first else { return }

        var cursors = try modelContext.fetch(
            FetchDescriptor<SyncCursor>(predicate: #Predicate { $0.plaidItemID == itemID })
        )
        let cursorRow = cursors.first ?? {
            let created = SyncCursor(plaidItemID: itemID)
            modelContext.insert(created)
            return created
        }()

        var hasMore = true
        var safety = 0

        while hasMore && safety < 50 {
            safety += 1
            let response = try await proxy.syncItem(
                SyncItemRequest(itemID: itemID, cursor: cursorRow.transactionsCursor)
            )

            try applyAccounts(response.accounts, to: institution)
            try applyTransactions(
                added: response.added,
                modified: response.modified,
                removed: response.removed
            )

            cursorRow.transactionsCursor = response.nextCursor
            cursorRow.updatedAt = .now
            hasMore = response.hasMore
        }

        institution.lastSyncedAt = .now
        institution.lastSyncError = nil
        for account in institution.accounts {
            account.lastSyncedAt = .now
        }
        try modelContext.save()
    }

    private func applyAccounts(_ dtos: [PlaidAccountDTO], to institution: Institution) throws {
        for dto in dtos {
            if let existing = institution.accounts.first(where: { $0.plaidAccountID == dto.accountID }) {
                existing.name = dto.name
                existing.officialName = dto.officialName
                existing.kind = PlaidMapper.accountKind(from: dto.type)
                existing.subtype = PlaidMapper.accountSubtype(from: dto.subtype)
                existing.mask = dto.mask
                existing.currentBalance = PlaidMapper.decimal(from: dto.balances.current)
                existing.availableBalance = dto.balances.available.map { Decimal($0) }
                existing.creditLimit = dto.balances.limit.map { Decimal($0) }
                existing.currencyCode = dto.balances.isoCurrencyCode ?? existing.currencyCode
                existing.isActive = true
            } else {
                let account = Account(
                    plaidAccountID: dto.accountID,
                    name: dto.name,
                    officialName: dto.officialName,
                    kind: PlaidMapper.accountKind(from: dto.type),
                    subtype: PlaidMapper.accountSubtype(from: dto.subtype),
                    mask: dto.mask,
                    currencyCode: dto.balances.isoCurrencyCode ?? "USD",
                    currentBalance: PlaidMapper.decimal(from: dto.balances.current),
                    availableBalance: dto.balances.available.map { Decimal($0) },
                    creditLimit: dto.balances.limit.map { Decimal($0) },
                    institution: institution
                )
                modelContext.insert(account)
            }
        }
    }

    private func applyTransactions(
        added: [PlaidTransactionDTO],
        modified: [PlaidTransactionDTO],
        removed: [PlaidRemovedTransactionDTO]
    ) throws {
        let categories = try modelContext.fetch(FetchDescriptor<Category>())
        let accounts = try modelContext.fetch(FetchDescriptor<Account>())
        let accountByPlaidID = Dictionary(uniqueKeysWithValues: accounts.map { ($0.plaidAccountID, $0) })

        for dto in added + modified {
            try upsert(dto: dto, accounts: accountByPlaidID, categories: categories)
        }

        for removedDTO in removed {
            let id = removedDTO.transactionID
            var descriptor = FetchDescriptor<Transaction>(
                predicate: #Predicate { $0.plaidTransactionID == id }
            )
            descriptor.fetchLimit = 1
            if let existing = try modelContext.fetch(descriptor).first {
                existing.isRemoved = true
                existing.status = .removed
                existing.updatedAt = .now
            }
        }
    }

    private func upsert(
        dto: PlaidTransactionDTO,
        accounts: [String: Account],
        categories: [Category]
    ) throws {
        // Prefer matching by pending→posted transition.
        var existing: Transaction?
        if let pendingID = dto.pendingTransactionID {
            var pendingDescriptor = FetchDescriptor<Transaction>(
                predicate: #Predicate { $0.plaidTransactionID == pendingID }
            )
            pendingDescriptor.fetchLimit = 1
            existing = try modelContext.fetch(pendingDescriptor).first
        }
        if existing == nil {
            let txnID = dto.transactionID
            var descriptor = FetchDescriptor<Transaction>(
                predicate: #Predicate { $0.plaidTransactionID == txnID }
            )
            descriptor.fetchLimit = 1
            existing = try modelContext.fetch(descriptor).first
        }

        let account = accounts[dto.accountID]
        let category = PlaidMapper.resolveCategory(
            primary: dto.personalFinanceCategory?.primary,
            detailed: dto.personalFinanceCategory?.detailed,
            categories: categories
        )

        if let existing {
            existing.plaidTransactionID = dto.transactionID
            existing.pendingTransactionID = dto.pendingTransactionID
            existing.merchantName = dto.merchantName
            existing.name = dto.name
            existing.amount = Decimal(dto.amount)
            existing.isoCurrencyCode = dto.isoCurrencyCode ?? "USD"
            existing.date = PlaidMapper.parseDate(dto.date)
            if let authorized = dto.authorizedDate {
                existing.authorizedDate = PlaidMapper.parseDate(authorized)
            }
            existing.status = dto.pending ? .pending : .posted
            existing.isRemoved = false
            existing.plaidCategoryPrimary = dto.personalFinanceCategory?.primary
            existing.plaidCategoryDetailed = dto.personalFinanceCategory?.detailed
            existing.account = account
            existing.category = category
            existing.updatedAt = .now
        } else {
            let txn = Transaction(
                plaidTransactionID: dto.transactionID,
                pendingTransactionID: dto.pendingTransactionID,
                merchantName: dto.merchantName,
                name: dto.name,
                amount: Decimal(dto.amount),
                isoCurrencyCode: dto.isoCurrencyCode ?? "USD",
                date: PlaidMapper.parseDate(dto.date),
                authorizedDate: dto.authorizedDate.map(PlaidMapper.parseDate),
                status: dto.pending ? .pending : .posted,
                plaidCategoryPrimary: dto.personalFinanceCategory?.primary,
                plaidCategoryDetailed: dto.personalFinanceCategory?.detailed,
                account: account,
                category: category
            )
            modelContext.insert(txn)
        }
    }

    private func recordNetWorthSnapshot() throws {
        let accounts = try modelContext.fetch(
            FetchDescriptor<Account>(predicate: #Predicate { $0.isActive && !$0.isHidden })
        )
        let summary = FinancialCalculator.netWorth(
            accounts: accounts.map {
                AccountBalanceInput(group: $0.group, currentBalance: $0.currentBalance, isActive: $0.isActive)
            }
        )

        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: .now)
        let snapshots = try modelContext.fetch(FetchDescriptor<NetWorthSnapshot>())
        if let today = snapshots.first(where: { calendar.isDate($0.date, inSameDayAs: startOfDay) }) {
            today.netWorth = summary.netWorth
            today.cash = summary.cash
            today.investments = summary.investments
            today.credit = summary.credit
        } else {
            modelContext.insert(
                NetWorthSnapshot(
                    date: startOfDay,
                    netWorth: summary.netWorth,
                    cash: summary.cash,
                    investments: summary.investments,
                    credit: summary.credit
                )
            )
        }
        try modelContext.save()
    }
}
