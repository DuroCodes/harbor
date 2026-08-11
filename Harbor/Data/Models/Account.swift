import Foundation
import SwiftData

@Model
final class Account {
    @Attribute(.unique) var id: UUID
    var plaidAccountID: String
    var name: String
    var officialName: String?
    var kindRaw: String
    var subtypeRaw: String
    var mask: String?
    var currencyCode: String
    var currentBalance: Decimal
    var availableBalance: Decimal?
    var creditLimit: Decimal?
    var isHidden: Bool
    var isActive: Bool
    var lastSyncedAt: Date?

    var institution: Institution?

    @Relationship(deleteRule: .cascade, inverse: \Transaction.account)
    var transactions: [Transaction]

    var kind: AccountKind {
        get { AccountKind(rawValue: kindRaw) ?? .other }
        set { kindRaw = newValue.rawValue }
    }

    var subtype: AccountSubtype {
        get { AccountSubtype(rawValue: subtypeRaw) ?? .other }
        set { subtypeRaw = newValue.rawValue }
    }

    var group: AccountGroup { kind.group }

    var displayName: String {
        if let officialName, !officialName.isEmpty { return officialName }
        return name
    }

    var balanceForNetWorth: Decimal {
        switch group {
        case .credit: abs(currentBalance)
        default: currentBalance
        }
    }

    init(
        id: UUID = UUID(),
        plaidAccountID: String,
        name: String,
        officialName: String? = nil,
        kind: AccountKind,
        subtype: AccountSubtype,
        mask: String? = nil,
        currencyCode: String = "USD",
        currentBalance: Decimal = 0,
        availableBalance: Decimal? = nil,
        creditLimit: Decimal? = nil,
        isHidden: Bool = false,
        isActive: Bool = true,
        lastSyncedAt: Date? = nil,
        institution: Institution? = nil,
        transactions: [Transaction] = []
    ) {
        self.id = id
        self.plaidAccountID = plaidAccountID
        self.name = name
        self.officialName = officialName
        self.kindRaw = kind.rawValue
        self.subtypeRaw = subtype.rawValue
        self.mask = mask
        self.currencyCode = currencyCode
        self.currentBalance = currentBalance
        self.availableBalance = availableBalance
        self.creditLimit = creditLimit
        self.isHidden = isHidden
        self.isActive = isActive
        self.lastSyncedAt = lastSyncedAt
        self.institution = institution
        self.transactions = transactions
    }
}
