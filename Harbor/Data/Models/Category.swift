import Foundation
import SwiftData

@Model
final class Category {
    @Attribute(.unique) var id: UUID
    var name: String
    var systemImage: String
    var isIncome: Bool
    var isTransfer: Bool
    var isDefault: Bool
    var sortOrder: Int
    var plaidPrimaryKeys: [String]
    /// Monthly spending limit. `nil` or `<= 0` means no budget.
    var monthlyBudgetLimit: Decimal?

    @Relationship(deleteRule: .nullify, inverse: \Transaction.category)
    var transactions: [Transaction]

    init(
        id: UUID = UUID(),
        name: String,
        systemImage: String,
        isIncome: Bool = false,
        isTransfer: Bool = false,
        isDefault: Bool = false,
        sortOrder: Int = 0,
        plaidPrimaryKeys: [String] = [],
        monthlyBudgetLimit: Decimal? = nil,
        transactions: [Transaction] = []
    ) {
        self.id = id
        self.name = name
        self.systemImage = systemImage
        self.isIncome = isIncome
        self.isTransfer = isTransfer
        self.isDefault = isDefault
        self.sortOrder = sortOrder
        self.plaidPrimaryKeys = plaidPrimaryKeys
        self.monthlyBudgetLimit = monthlyBudgetLimit
        self.transactions = transactions
    }

    var hasBudget: Bool {
        guard let monthlyBudgetLimit else { return false }
        return monthlyBudgetLimit > 0
    }
}
