import Foundation

struct NetWorthSummary: Equatable, Sendable {
    var cash: Decimal
    var investments: Decimal
    var credit: Decimal

    var netWorth: Decimal { cash + investments - credit }

    static let zero = NetWorthSummary(cash: 0, investments: 0, credit: 0)
}

struct MonthlyCashFlow: Equatable, Sendable {
    var income: Decimal
    var spending: Decimal

    var net: Decimal { income - spending }
}

struct CashFlowNode: Identifiable, Equatable, Sendable {
    let id: String
    let title: String
    let amount: Decimal
    let systemImage: String?
    let kind: Kind

    enum Kind: Equatable, Sendable {
        case income
        case expense
        case leftover
    }
}

struct CashFlowLink: Identifiable, Equatable, Sendable {
    let id: String
    let sourceID: String
    let targetID: String
    let amount: Decimal
}

struct CashFlowSankeyData: Equatable, Sendable {
    var incomeNodes: [CashFlowNode]
    var outflowNodes: [CashFlowNode]
    var links: [CashFlowLink]
    var totalIncome: Decimal
    var totalSpending: Decimal

    var leftover: Decimal { totalIncome - totalSpending }

    var isEmpty: Bool { totalIncome == 0 && totalSpending == 0 }
}

enum FinancialCalculator {
    /// Credit and loan balances contribute to debt; cash/investments to assets.
    static func netWorth(accounts: [AccountBalanceInput]) -> NetWorthSummary {
        var summary = NetWorthSummary.zero
        for account in accounts where account.isActive {
            let balance = account.currentBalance
            switch account.group {
            case .cash:
                summary.cash += balance
            case .investments:
                summary.investments += balance
            case .credit:
                summary.credit += abs(balance)
            case .other:
                if balance >= 0 {
                    summary.cash += balance
                } else {
                    summary.credit += abs(balance)
                }
            }
        }
        return summary
    }

    static func monthlyCashFlow(
        transactions: [CashFlowTransactionInput],
        in month: Date,
        calendar: Calendar = .current
    ) -> MonthlyCashFlow {
        let breakdown = cashFlowSankey(transactions: transactions, in: month, calendar: calendar)
        return MonthlyCashFlow(income: breakdown.totalIncome, spending: breakdown.totalSpending)
    }

    /// Builds a Monarch-style cash-flow Sankey: income sources → expense categories (+ leftover).
    static func cashFlowSankey(
        transactions: [CashFlowTransactionInput],
        in month: Date,
        calendar: Calendar = .current
    ) -> CashFlowSankeyData {
        let start = calendar.date(from: calendar.dateComponents([.year, .month], from: month)) ?? month
        guard let end = calendar.date(byAdding: DateComponents(month: 1), to: start) else {
            return CashFlowSankeyData(
                incomeNodes: [],
                outflowNodes: [],
                links: [],
                totalIncome: 0,
                totalSpending: 0
            )
        }

        var incomeByCategory: [String: (title: String, amount: Decimal, image: String?)] = [:]
        var expenseByCategory: [String: (title: String, amount: Decimal, image: String?)] = [:]

        for txn in transactions {
            guard txn.status == .posted || txn.status == .pending else { continue }
            guard txn.date >= start && txn.date < end else { continue }
            guard !txn.isTransfer else { continue }

            let key = txn.categoryID ?? txn.categoryName ?? "other"
            let title = txn.categoryName ?? "Other"
            let image = txn.categoryImage
            let amount = abs(txn.amount)

            if txn.isIncome {
                // Explicit income category.
                let existing = incomeByCategory[key]
                incomeByCategory[key] = (
                    title: title,
                    amount: (existing?.amount ?? 0) + amount,
                    image: image ?? existing?.image ?? "arrow.down.circle"
                )
            } else if txn.amount < 0 {
                // Inflow that isn't tagged Income: treat as a refund against that category when possible.
                if title != "Other", !txn.isIncome, expenseByCategory[key] != nil || txn.categoryName != nil {
                    let existing = expenseByCategory[key]
                    let next = (existing?.amount ?? 0) - amount
                    if next > 0 {
                        expenseByCategory[key] = (
                            title: title,
                            amount: next,
                            image: image ?? existing?.image
                        )
                    } else {
                        expenseByCategory.removeValue(forKey: key)
                        // Overflow refund becomes general income.
                        if next < 0 {
                            let incomeKey = "income-general"
                            let existingIncome = incomeByCategory[incomeKey]
                            incomeByCategory[incomeKey] = (
                                title: "Income",
                                amount: (existingIncome?.amount ?? 0) + abs(next),
                                image: "arrow.down.circle"
                            )
                        }
                    }
                } else {
                    let incomeKey = key
                    let existing = incomeByCategory[incomeKey]
                    incomeByCategory[incomeKey] = (
                        title: title == "Other" ? "Income" : title,
                        amount: (existing?.amount ?? 0) + amount,
                        image: image ?? existing?.image ?? "arrow.down.circle"
                    )
                }
            } else if txn.amount > 0 {
                let existing = expenseByCategory[key]
                expenseByCategory[key] = (
                    title: title,
                    amount: (existing?.amount ?? 0) + amount,
                    image: image ?? existing?.image
                )
            }
        }

        let incomeNodes = incomeByCategory
            .map { key, value in
                CashFlowNode(
                    id: "in-\(key)",
                    title: value.title,
                    amount: value.amount,
                    systemImage: value.image,
                    kind: .income
                )
            }
            .sorted { $0.amount > $1.amount }

        let expenseNodes = expenseByCategory
            .map { key, value in
                CashFlowNode(
                    id: "out-\(key)",
                    title: value.title,
                    amount: value.amount,
                    systemImage: value.image,
                    kind: .expense
                )
            }
            .sorted { $0.amount > $1.amount }

        let totalIncome = incomeNodes.reduce(Decimal.zero) { $0 + $1.amount }
        let totalSpending = expenseNodes.reduce(Decimal.zero) { $0 + $1.amount }
        let leftover = totalIncome - totalSpending

        var outflowNodes = expenseNodes
        if leftover > 0 {
            outflowNodes.append(
                CashFlowNode(
                    id: "out-leftover",
                    title: "Left over",
                    amount: leftover,
                    systemImage: "leaf",
                    kind: .leftover
                )
            )
        }

        var links: [CashFlowLink] = []
        let outflowTotal = outflowNodes.reduce(Decimal.zero) { $0 + $1.amount }
        guard outflowTotal > 0, !incomeNodes.isEmpty else {
            return CashFlowSankeyData(
                incomeNodes: incomeNodes,
                outflowNodes: outflowNodes,
                links: [],
                totalIncome: totalIncome,
                totalSpending: totalSpending
            )
        }

        for income in incomeNodes {
            for outflow in outflowNodes {
                let share = income.amount * (outflow.amount / outflowTotal)
                guard share > 0 else { continue }
                links.append(
                    CashFlowLink(
                        id: "\(income.id)->\(outflow.id)",
                        sourceID: income.id,
                        targetID: outflow.id,
                        amount: share
                    )
                )
            }
        }

        return CashFlowSankeyData(
            incomeNodes: incomeNodes,
            outflowNodes: outflowNodes,
            links: links,
            totalIncome: totalIncome,
            totalSpending: totalSpending
        )
    }
}

struct AccountBalanceInput: Sendable {
    var group: AccountGroup
    var currentBalance: Decimal
    var isActive: Bool
}

struct CashFlowTransactionInput: Sendable {
    var amount: Decimal
    var date: Date
    var status: TransactionStatus
    var isIncome: Bool
    var isTransfer: Bool
    var categoryID: String? = nil
    var categoryName: String? = nil
    var categoryImage: String? = nil
}

struct CategoryBudgetInput: Sendable {
    var categoryID: String
    var categoryName: String
    var systemImage: String
    var monthlyLimit: Decimal
}

struct CategoryBudgetProgress: Identifiable, Equatable, Sendable {
    var id: String
    var categoryName: String
    var systemImage: String
    var limit: Decimal
    var spent: Decimal

    var remaining: Decimal { limit - spent }
    var isOverBudget: Bool { spent > limit }
    /// 0…1+ (can exceed 1 when over budget).
    var fractionUsed: Double {
        guard limit > 0 else { return spent > 0 ? 1 : 0 }
        return NSDecimalNumber(decimal: spent / limit).doubleValue
    }
}

extension FinancialCalculator {
    /// Spending vs monthly limits for categories that have a budget set.
    static func categoryBudgetProgress(
        budgets: [CategoryBudgetInput],
        transactions: [CashFlowTransactionInput],
        in month: Date,
        calendar: Calendar = .current
    ) -> [CategoryBudgetProgress] {
        guard !budgets.isEmpty else { return [] }

        let sankey = cashFlowSankey(transactions: transactions, in: month, calendar: calendar)
        var spentByCategoryID: [String: Decimal] = [:]
        for node in sankey.outflowNodes where node.kind == .expense {
            // Node ids are "out-<categoryKey>"; recover the raw key.
            let key = node.id.hasPrefix("out-") ? String(node.id.dropFirst(4)) : node.id
            spentByCategoryID[key] = node.amount
        }

        return budgets
            .filter { $0.monthlyLimit > 0 }
            .map { budget in
                CategoryBudgetProgress(
                    id: budget.categoryID,
                    categoryName: budget.categoryName,
                    systemImage: budget.systemImage,
                    limit: budget.monthlyLimit,
                    spent: spentByCategoryID[budget.categoryID] ?? 0
                )
            }
            .sorted { lhs, rhs in
                if lhs.isOverBudget != rhs.isOverBudget { return lhs.isOverBudget && !rhs.isOverBudget }
                return lhs.fractionUsed > rhs.fractionUsed
            }
    }
}
