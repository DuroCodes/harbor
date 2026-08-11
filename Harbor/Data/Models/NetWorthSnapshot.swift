import Foundation
import SwiftData

@Model
final class NetWorthSnapshot {
    @Attribute(.unique) var id: UUID
    var date: Date
    var netWorth: Decimal
    var cash: Decimal
    var investments: Decimal
    var credit: Decimal

    init(
        id: UUID = UUID(),
        date: Date = .now,
        netWorth: Decimal,
        cash: Decimal,
        investments: Decimal,
        credit: Decimal
    ) {
        self.id = id
        self.date = date
        self.netWorth = netWorth
        self.cash = cash
        self.investments = investments
        self.credit = credit
    }
}

@Model
final class SyncCursor {
    @Attribute(.unique) var id: UUID
    var plaidItemID: String
    var transactionsCursor: String?
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        plaidItemID: String,
        transactionsCursor: String? = nil,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.plaidItemID = plaidItemID
        self.transactionsCursor = transactionsCursor
        self.updatedAt = updatedAt
    }
}
