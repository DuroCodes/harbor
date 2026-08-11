import Foundation

enum AccountGroup: String, Codable, CaseIterable, Identifiable, Sendable {
    case cash
    case credit
    case investments
    case other

    var id: String { rawValue }

    var title: String {
        switch self {
        case .cash: "Cash"
        case .credit: "Credit"
        case .investments: "Investments"
        case .other: "Other"
        }
    }

    var systemImage: String {
        switch self {
        case .cash: "banknote"
        case .credit: "creditcard"
        case .investments: "chart.line.uptrend.xyaxis"
        case .other: "rectangle.stack"
        }
    }
}

enum AccountKind: String, Codable, CaseIterable, Sendable {
    case depository
    case credit
    case investment
    case loan
    case brokerage
    case other

    var group: AccountGroup {
        switch self {
        case .depository: .cash
        case .credit, .loan: .credit
        case .investment, .brokerage: .investments
        case .other: .other
        }
    }
}

enum AccountSubtype: String, Codable, CaseIterable, Sendable {
    case checking
    case savings
    case moneyMarket
    case creditCard
    case brokerage
    case ira
    case _401k = "401k"
    case _403b = "403b"
    case retirement
    case student
    case mortgage
    case other

    var displayName: String {
        switch self {
        case .checking: "Checking"
        case .savings: "Savings"
        case .moneyMarket: "Money Market"
        case .creditCard: "Credit Card"
        case .brokerage: "Brokerage"
        case .ira: "IRA"
        case ._401k: "401(k)"
        case ._403b: "403(b)"
        case .retirement: "Retirement"
        case .student: "Student Loan"
        case .mortgage: "Mortgage"
        case .other: "Other"
        }
    }
}

enum TransactionStatus: String, Codable, Sendable {
    case pending
    case posted
    case removed
}

enum DefaultCategoryKey: String, CaseIterable, Sendable {
    case foodAndDining
    case groceries
    case transportation
    case shopping
    case entertainment
    case billsAndUtilities
    case housing
    case healthcare
    case travel
    case income
    case transfers
    case other

    var name: String {
        switch self {
        case .foodAndDining: "Food & Dining"
        case .groceries: "Groceries"
        case .transportation: "Transportation"
        case .shopping: "Shopping"
        case .entertainment: "Entertainment"
        case .billsAndUtilities: "Bills & Utilities"
        case .housing: "Housing"
        case .healthcare: "Healthcare"
        case .travel: "Travel"
        case .income: "Income"
        case .transfers: "Transfers"
        case .other: "Other"
        }
    }

    var systemImage: String {
        switch self {
        case .foodAndDining: "fork.knife"
        case .groceries: "cart"
        case .transportation: "car"
        case .shopping: "bag"
        case .entertainment: "theatermasks"
        case .billsAndUtilities: "bolt"
        case .housing: "house"
        case .healthcare: "cross.case"
        case .travel: "airplane"
        case .income: "arrow.down.circle"
        case .transfers: "arrow.left.arrow.right"
        case .other: "ellipsis.circle"
        }
    }

    var isIncome: Bool { self == .income }
    var isTransfer: Bool { self == .transfers }
}
