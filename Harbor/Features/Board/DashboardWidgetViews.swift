import SwiftUI
import SwiftData

/// Renders Home blocks plus optional cash-flow charts.
struct DashboardWidgetContainer: View {
    let kind: DashboardWidgetKind
    var width: DashboardWidgetWidth = .full
    /// Disabled while the board is in edit mode.
    var navigationEnabled: Bool = true

    @Environment(AppNavigator.self) private var navigator

    @Query(filter: #Predicate<Account> { $0.isActive && !$0.isHidden })
    private var accounts: [Account]
    @Query(sort: \Transaction.date, order: .reverse)
    private var transactions: [Transaction]
    @Query(sort: \NetWorthSnapshot.date)
    private var snapshots: [NetWorthSnapshot]
    @Query(sort: \Category.sortOrder)
    private var categories: [Category]

    private var isCompact: Bool { width == .half }

    private var summary: NetWorthSummary {
        FinancialCalculator.netWorth(
            accounts: accounts.map {
                AccountBalanceInput(group: $0.group, currentBalance: $0.currentBalance, isActive: $0.isActive)
            }
        )
    }

    private var cashFlow: MonthlyCashFlow {
        FinancialCalculator.monthlyCashFlow(
            transactions: transactions.map {
                CashFlowTransactionInput(
                    amount: $0.amount,
                    date: $0.date,
                    status: $0.status,
                    isIncome: $0.category?.isIncome ?? false,
                    isTransfer: $0.category?.isTransfer ?? false
                )
            },
            in: .now
        )
    }

    private var sankeyData: CashFlowSankeyData {
        FinancialCalculator.cashFlowSankey(
            transactions: transactions.map {
                CashFlowTransactionInput(
                    amount: $0.amount,
                    date: $0.date,
                    status: $0.status,
                    isIncome: $0.category?.isIncome ?? false,
                    isTransfer: $0.category?.isTransfer ?? false,
                    categoryID: $0.category?.id.uuidString,
                    categoryName: $0.category?.name,
                    categoryImage: $0.category?.systemImage
                )
            },
            in: .now
        )
    }

    private var recentTransactions: [Transaction] {
        Array(transactions.filter { !$0.isRemoved }.prefix(5))
    }

    private var budgetProgress: [CategoryBudgetProgress] {
        let budgets = categories.compactMap { category -> CategoryBudgetInput? in
            guard !category.isIncome, !category.isTransfer else { return nil }
            guard let limit = category.monthlyBudgetLimit, limit > 0 else { return nil }
            return CategoryBudgetInput(
                categoryID: category.id.uuidString,
                categoryName: category.name,
                systemImage: category.systemImage,
                monthlyLimit: limit
            )
        }
        return FinancialCalculator.categoryBudgetProgress(
            budgets: budgets,
            transactions: transactions.map {
                CashFlowTransactionInput(
                    amount: $0.amount,
                    date: $0.date,
                    status: $0.status,
                    isIncome: $0.category?.isIncome ?? false,
                    isTransfer: $0.category?.isTransfer ?? false,
                    categoryID: $0.category?.id.uuidString,
                    categoryName: $0.category?.name,
                    categoryImage: $0.category?.systemImage
                )
            },
            in: .now
        )
    }

    var body: some View {
        let content = Group {
            switch kind {
            case .netWorth:
                NetWorthHeroBlock(netWorth: summary.netWorth)
            case .netWorthChart:
                NetWorthChartBlock(snapshots: snapshots, compact: isCompact)
            case .assets:
                AssetsBlock(
                    cash: summary.cash,
                    investments: summary.investments,
                    credit: summary.credit,
                    compact: isCompact
                )
            case .incomeSpending:
                IncomeSpendingCard(
                    income: cashFlow.income,
                    spending: cashFlow.spending,
                    compact: isCompact,
                    showsHeader: true
                )
            case .recentActivity:
                RecentTransactionsBlock(
                    transactions: recentTransactions,
                    onHeaderTap: navigationEnabled ? { navigator.openActivity() } : nil,
                    onTransactionTap: navigationEnabled ? { navigator.openTransaction(id: $0.id) } : nil
                )
            case .sankey:
                sankeyWidget
            case .pie:
                pieWidget
            case .budgets:
                budgetsWidget
            }
        }

        if navigationEnabled, let destinationLabel {
            content
                .contentShape(Rectangle())
                .onTapGesture(perform: openDestination)
                .accessibilityAddTraits(.isButton)
                .accessibilityHint("Opens \(destinationLabel)")
        } else {
            content
        }
    }

    private var destinationLabel: String? {
        switch kind {
        case .assets: "Accounts"
        case .incomeSpending, .sankey, .pie: "Cash Flow"
        case .budgets: "Budgets"
        case .recentActivity, .netWorth, .netWorthChart: nil
        }
    }

    private func openDestination() {
        switch kind {
        case .assets:
            navigator.openAccounts()
        case .incomeSpending, .sankey, .pie:
            navigator.openCashFlow()
        case .budgets:
            navigator.openBudgets()
        case .recentActivity, .netWorth, .netWorthChart:
            break
        }
    }

    private var sankeyWidget: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Cash flow")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(HarborSurface.labelSecondary)

            if sankeyData.isEmpty {
                Text("No activity this month.")
                    .font(.subheadline)
                    .foregroundStyle(HarborSurface.labelMuted)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .padding(16)
                    .harborCard()
            } else {
                SankeyDiagramView(data: sankeyData, compact: isCompact)
                    .padding(isCompact ? 10 : 12)
                    .frame(
                        maxWidth: .infinity,
                        maxHeight: isCompact ? .infinity : nil,
                        alignment: .center
                    )
                    .frame(height: isCompact ? HarborTheme.halfTileCardHeight : nil)
                    .background(
                        HarborSurface.elevated,
                        in: RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous)
                    )
            }
        }
        .frame(maxHeight: isCompact ? .infinity : nil, alignment: .top)
    }

    private var pieWidget: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Spending")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(HarborSurface.labelSecondary)

            if sankeyData.isEmpty || sankeyData.totalSpending == 0 {
                Text("No spending this month.")
                    .font(.subheadline)
                    .foregroundStyle(HarborSurface.labelMuted)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .padding(16)
                    .frame(height: isCompact ? HarborTheme.halfTileCardHeight : nil)
                    .background(
                        HarborSurface.elevated,
                        in: RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous)
                    )
            } else {
                CashFlowPieChartView(data: sankeyData, compact: isCompact)
                    .padding(isCompact ? 10 : 12)
                    .frame(
                        maxWidth: .infinity,
                        maxHeight: isCompact ? .infinity : nil,
                        alignment: .center
                    )
                    .frame(height: isCompact ? HarborTheme.halfTileCardHeight : nil)
                    .background(
                        HarborSurface.elevated,
                        in: RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous)
                    )
            }
        }
        .frame(maxHeight: isCompact ? .infinity : nil, alignment: .top)
    }

    private var budgetsWidget: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Budgets")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(HarborSurface.labelSecondary)

            BudgetProgressList(
                items: Array(budgetProgress.prefix(5)),
                emptyMessage: "Tap to set category budgets."
            )
        }
    }
}
