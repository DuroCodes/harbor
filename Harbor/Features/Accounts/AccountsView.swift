import SwiftUI
import SwiftData

struct AccountsView: View {
    @Query(filter: #Predicate<Account> { $0.isActive && !$0.isHidden }, sort: \Account.name)
    private var accounts: [Account]
    @Environment(SyncService.self) private var syncService
    @State private var showConnect = false
    @State private var unlinkError: String?

    private var grouped: [(AccountGroup, [Account])] {
        AccountGroup.allCases.compactMap { group in
            let items = accounts.filter { $0.group == group }
            return items.isEmpty ? nil : (group, items)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(grouped, id: \.0) { group, items in
                    Section {
                        ForEach(items, id: \.id) { account in
                            NavigationLink {
                                AccountDetailView(account: account)
                            } label: {
                                AccountRow(account: account)
                            }
                            .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                            .listRowBackground(HarborSurface.elevated)
                            .listRowSeparatorTint(HarborSurface.hairline)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                if account.institution != nil {
                                    Button("Unlink", role: .destructive) {
                                        Task { await unlink(account: account) }
                                    }
                                }
                            }
                        }
                    } header: {
                        Text(group.title)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(HarborSurface.labelMuted)
                            .textCase(.none)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .harborListChrome()
            .harborInlineTitle("Accounts")
            .harborScreen()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HarborHeaderButton(systemImage: "plus", accessibilityLabel: "Connect account") {
                        showConnect = true
                    }
                }
            }
            .refreshable {
                await syncService.refreshAll()
            }
            .sheet(isPresented: $showConnect) {
                ConnectAccountView()
            }
            .overlay {
                if accounts.isEmpty {
                    ContentUnavailableView(
                        "No Accounts",
                        systemImage: "building.columns",
                        description: Text("Connect an institution to get started.")
                    )
                    .foregroundStyle(HarborSurface.labelMuted)
                }
            }
            .alert("Couldn’t Unlink", isPresented: Binding(
                get: { unlinkError != nil },
                set: { if !$0 { unlinkError = nil } }
            )) {
                Button("OK", role: .cancel) { unlinkError = nil }
            } message: {
                Text(unlinkError ?? "")
            }
        }
    }

    private func unlink(account: Account) async {
        guard let institution = account.institution else { return }
        do {
            try await syncService.unlink(institution: institution)
        } catch {
            unlinkError = error.localizedDescription
        }
    }
}

struct AccountDetailView: View {
    let account: Account
    @Query private var transactions: [Transaction]
    @Environment(SyncService.self) private var syncService
    @Environment(\.dismiss) private var dismiss

    @State private var confirmUnlink = false
    @State private var isUnlinking = false
    @State private var unlinkError: String?

    init(account: Account) {
        self.account = account
        let accountID = account.id
        _transactions = Query(
            filter: #Predicate<Transaction> { txn in
                txn.account?.id == accountID && !txn.isRemoved
            },
            sort: \Transaction.date,
            order: .reverse
        )
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 6) {
                    Text(heroSubtitle)
                        .font(.subheadline)
                        .foregroundStyle(HarborSurface.labelMuted)
                    Text(HarborFormatters.money(account.currentBalance))
                        .font(HarborTypography.heroBalance)
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 12, trailing: 20))

                if account.displayName != account.subtype.displayName {
                    LabeledContent("Name", value: account.displayName)
                }
                if let available = account.availableBalance {
                    LabeledContent("Available", value: HarborFormatters.money(available))
                }
                LabeledContent("Institution", value: account.institution?.name ?? "—")
                if let mask = account.mask {
                    LabeledContent("Account", value: "••••\(mask)")
                }
            }
            .listRowBackground(HarborSurface.elevated)

            if !transactions.isEmpty {
                Section("Recent") {
                    ForEach(transactions.prefix(12), id: \.id) { transaction in
                        TransactionRow(transaction: transaction)
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    }
                }
                .listRowBackground(HarborSurface.elevated)
            }

            if account.institution != nil {
                Section {
                    Button(role: .destructive) {
                        confirmUnlink = true
                    } label: {
                        if isUnlinking {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Unlink Institution")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(isUnlinking)
                } footer: {
                    Text("Removes this institution and all of its accounts and transactions from Harbor.")
                        .foregroundStyle(HarborSurface.labelMuted)
                }
                .listRowBackground(HarborSurface.elevated)
            }
        }
        .listStyle(.insetGrouped)
        .harborListChrome()
        .navigationTitle(account.subtype.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .harborScreen()
        .confirmationDialog(
            "Unlink \(account.institution?.name ?? "Institution")?",
            isPresented: $confirmUnlink,
            titleVisibility: .visible
        ) {
            Button("Unlink", role: .destructive) {
                Task { await unlink() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This disconnects the bank connection and deletes its local data. You can reconnect later.")
        }
        .alert("Couldn’t Unlink", isPresented: Binding(
            get: { unlinkError != nil },
            set: { if !$0 { unlinkError = nil } }
        )) {
            Button("OK", role: .cancel) { unlinkError = nil }
        } message: {
            Text(unlinkError ?? "")
        }
    }

    private var heroSubtitle: String {
        var parts: [String] = []
        if let institution = account.institution?.name {
            parts.append(institution)
        }
        if let mask = account.mask {
            parts.append("••••\(mask)")
        }
        return parts.isEmpty ? account.subtype.displayName : parts.joined(separator: " · ")
    }

    private func unlink() async {
        guard let institution = account.institution else { return }
        isUnlinking = true
        defer { isUnlinking = false }
        do {
            try await syncService.unlink(institution: institution)
            dismiss()
        } catch {
            unlinkError = error.localizedDescription
        }
    }
}
