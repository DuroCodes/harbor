import SwiftUI
import SwiftData

struct RootTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(filter: #Predicate<Account> { $0.isActive && !$0.isHidden })
    private var accounts: [Account]

    @State private var services: AppServices?
    @State private var navigator = AppNavigator()

    private var hasAccounts: Bool { !accounts.isEmpty }

    var body: some View {
        Group {
            if let services {
                TabView(selection: $navigator.selectedTab) {
                    Tab("Home", systemImage: HarborBrand.homeTabSystemImage, value: AppTab.dashboard) {
                        BoardView()
                    }

                    if hasAccounts {
                        Tab("Cash Flow", systemImage: "chart.bar", value: AppTab.cashFlow) {
                            CashFlowView()
                        }
                        Tab("Activity", systemImage: "list.bullet", value: AppTab.activity) {
                            TransactionsView()
                        }
                        Tab("Accounts", systemImage: "building.columns", value: AppTab.accounts) {
                            AccountsView()
                        }
                        Tab("Budgets", systemImage: "chart.bar.doc.horizontal", value: AppTab.budgets) {
                            NavigationStack {
                                BudgetsView()
                            }
                        }
                    }
                }
                .environment(services)
                .environment(services.sync)
                .environment(navigator)
                .toolbarBackground(HarborSurface.canvas, for: .tabBar)
                .toolbarBackground(.visible, for: .tabBar)
                .toolbarColorScheme(.dark, for: .tabBar)
                .sheet(isPresented: $navigator.showSettings) {
                    SettingsView()
                }
                .onChange(of: hasAccounts) { _, connected in
                    navigator.accountsAvailable = connected
                    if !connected, [.cashFlow, .activity, .accounts, .budgets].contains(navigator.selectedTab) {
                        navigator.selectedTab = .dashboard
                    }
                }
                .onAppear {
                    navigator.accountsAvailable = hasAccounts
                }
            } else {
                ProgressView()
                    .tint(HarborBrand.accent)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(HarborSurface.canvas.ignoresSafeArea())
            }
        }
        .task {
            guard services == nil else { return }
            let created = AppServices(modelContext: modelContext)
            services = created
            await created.sync.refreshAll()
        }
    }
}
