import SwiftUI
import SwiftData

struct TransactionsView: View {
    @Environment(AppNavigator.self) private var navigator
    @Query(sort: \Transaction.date, order: .reverse)
    private var allTransactions: [Transaction]
    @Query(sort: \Category.sortOrder)
    private var categories: [Category]
    @Query(filter: #Predicate<Account> { $0.isActive }, sort: \Account.name)
    private var accounts: [Account]

    @State private var searchText = ""
    @State private var selectedCategoryID: UUID?
    @State private var selectedAccountID: UUID?
    @State private var showPendingOnly = false
    @State private var path = NavigationPath()

    private var filtered: [Transaction] {
        var items = allTransactions.filter { !$0.isRemoved }

        if !searchText.isEmpty {
            let query = searchText.lowercased()
            items = items.filter {
                $0.displayMerchant.lowercased().contains(query)
                || ($0.category?.name.lowercased().contains(query) ?? false)
            }
        }

        if let selectedCategoryID {
            items = items.filter { $0.category?.id == selectedCategoryID }
        }
        if let selectedAccountID {
            items = items.filter { $0.account?.id == selectedAccountID }
        }
        if showPendingOnly {
            items = items.filter { $0.status == .pending }
        }

        return items
    }

    var body: some View {
        NavigationStack(path: $path) {
            List {
                if filtered.isEmpty {
                    ContentUnavailableView(
                        "No Activity",
                        systemImage: "list.bullet",
                        description: Text("Transactions will appear after you connect an account.")
                    )
                    .foregroundStyle(HarborSurface.labelMuted)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                } else {
                    ForEach(filtered, id: \.id) { transaction in
                        NavigationLink(value: transaction.id) {
                            TransactionRow(transaction: transaction)
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowBackground(HarborSurface.canvas)
                        .listRowSeparatorTint(HarborSurface.hairline)
                    }
                }
            }
            .listStyle(.plain)
            .listRowSpacing(0)
            .environment(\.defaultMinListRowHeight, 48)
            .harborListChrome()
            .searchable(text: $searchText, prompt: "Search")
            .harborInlineTitle("Activity")
            .harborScreen()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    filterMenu
                }
            }
            .navigationDestination(for: UUID.self) { id in
                if let transaction = allTransactions.first(where: { $0.id == id }) {
                    TransactionDetailView(transaction: transaction)
                } else {
                    ContentUnavailableView(
                        "Transaction Unavailable",
                        systemImage: "exclamationmark.triangle",
                        description: Text("This transaction could not be found.")
                    )
                }
            }
            .onAppear {
                openPendingTransactionIfNeeded()
            }
            .onChange(of: navigator.pendingTransactionID) { _, _ in
                openPendingTransactionIfNeeded()
            }
        }
    }

    private func openPendingTransactionIfNeeded() {
        guard let id = navigator.pendingTransactionID else { return }
        navigator.pendingTransactionID = nil
        path = NavigationPath()
        path.append(id)
    }

    private var filterMenu: some View {
        HarborHeaderMenu(
            systemImage: "line.3.horizontal.decrease",
            accessibilityLabel: "Filter"
        ) {
            Toggle("Pending only", isOn: $showPendingOnly)

            Menu("Category") {
                Button("All") { selectedCategoryID = nil }
                ForEach(categories, id: \.id) { category in
                    Button(category.name) { selectedCategoryID = category.id }
                }
            }

            Menu("Account") {
                Button("All") { selectedAccountID = nil }
                ForEach(accounts, id: \.id) { account in
                    Button(account.displayName) { selectedAccountID = account.id }
                }
            }
        }
    }
}

struct TransactionDetailView: View {
    @Bindable var transaction: Transaction

    var body: some View {
        Form {
            Section {
                LabeledContent("Merchant", value: transaction.displayMerchant)
                LabeledContent("Amount", value: HarborFormatters.signedMoney(transaction.signedAmountForDisplay))
                LabeledContent("Date", value: HarborFormatters.mediumDate.string(from: transaction.date))
                if transaction.status == .pending {
                    LabeledContent("Status", value: "Pending")
                }
                if let account = transaction.account {
                    LabeledContent("Account", value: account.displayName)
                }
                if let category = transaction.category {
                    LabeledContent("Category", value: category.name)
                }
            }
            .listRowBackground(HarborSurface.elevated)

            Section("Notes") {
                TextField("Add a note", text: Binding(
                    get: { transaction.notes ?? "" },
                    set: { transaction.notes = $0.isEmpty ? nil : $0 }
                ), axis: .vertical)
                .lineLimit(2...4)
            }
            .listRowBackground(HarborSurface.elevated)
        }
        .scrollContentBackground(.hidden)
        .background(HarborSurface.canvas)
        .navigationTitle("Transaction")
        .navigationBarTitleDisplayMode(.inline)
        .harborScreen()
    }
}
