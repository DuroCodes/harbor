import Foundation
import SwiftData

@Model
final class Transaction {
    @Attribute(.unique) var id: UUID
    var plaidTransactionID: String
    var pendingTransactionID: String?
    var merchantName: String?
    var name: String
    var amount: Decimal
    var isoCurrencyCode: String
    var date: Date
    var authorizedDate: Date?
    var statusRaw: String
    var notes: String?
    var plaidCategoryPrimary: String?
    var plaidCategoryDetailed: String?
    var isRemoved: Bool
    var updatedAt: Date

    var account: Account?
    var category: Category?

    var status: TransactionStatus {
        get {
            if isRemoved { return .removed }
            return TransactionStatus(rawValue: statusRaw) ?? .posted
        }
        set {
            statusRaw = newValue.rawValue
            isRemoved = newValue == .removed
        }
    }

    /// Display title preferring merchant over raw name.
    var displayMerchant: String {
        if let merchantName, !merchantName.isEmpty { return merchantName }
        return name
    }

    /// Harbor convention: positive amounts are money out (expenses).
    var isExpense: Bool { amount > 0 }

    var signedAmountForDisplay: Decimal {
        // Expenses shown negative; income (Plaid negative) shown positive.
        -amount
    }

    init(
        id: UUID = UUID(),
        plaidTransactionID: String,
        pendingTransactionID: String? = nil,
        merchantName: String? = nil,
        name: String,
        amount: Decimal,
        isoCurrencyCode: String = "USD",
        date: Date,
        authorizedDate: Date? = nil,
        status: TransactionStatus = .posted,
        notes: String? = nil,
        plaidCategoryPrimary: String? = nil,
        plaidCategoryDetailed: String? = nil,
        isRemoved: Bool = false,
        updatedAt: Date = .now,
        account: Account? = nil,
        category: Category? = nil
    ) {
        self.id = id
        self.plaidTransactionID = plaidTransactionID
        self.pendingTransactionID = pendingTransactionID
        self.merchantName = merchantName
        self.name = name
        self.amount = amount
        self.isoCurrencyCode = isoCurrencyCode
        self.date = date
        self.authorizedDate = authorizedDate
        self.statusRaw = status.rawValue
        self.notes = notes
        self.plaidCategoryPrimary = plaidCategoryPrimary
        self.plaidCategoryDetailed = plaidCategoryDetailed
        self.isRemoved = isRemoved
        self.updatedAt = updatedAt
        self.account = account
        self.category = category
    }
}
