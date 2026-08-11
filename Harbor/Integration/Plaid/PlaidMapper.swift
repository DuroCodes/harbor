import Foundation

enum PlaidMapper {
    static func accountSubtype(from subtype: String?) -> AccountSubtype {
        guard let subtype else { return .other }
        switch subtype.lowercased() {
        case "checking":
            return .checking
        case "savings":
            return .savings
        case "money market", "moneymarket":
            return .moneyMarket
        case "credit card", "creditcard":
            return .creditCard
        case "brokerage":
            return .brokerage
        case "ira":
            return .ira
        case "401k":
            return ._401k
        case "403b":
            return ._403b
        case "retirement":
            return .retirement
        case "student":
            return .student
        case "mortgage":
            return .mortgage
        default:
            return .other
        }
    }

    static func accountKind(from type: String) -> AccountKind {
        switch type.lowercased() {
        case "depository":
            return .depository
        case "credit":
            return .credit
        case "investment":
            return .investment
        case "loan":
            return .loan
        case "brokerage":
            return .brokerage
        default:
            return .other
        }
    }

    static func decimal(from value: Double?) -> Decimal {
        guard let value else { return 0 }
        return Decimal(value)
    }

    static func parseDate(_ string: String) -> Date {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: string) ?? .now
    }

    static func resolveCategory(
        primary: String?,
        detailed: String?,
        categories: [Category]
    ) -> Category? {
        if let detailed,
           let match = categories.first(where: { $0.plaidPrimaryKeys.contains(detailed) }) {
            return match
        }
        if let primary,
           let match = categories.first(where: { $0.plaidPrimaryKeys.contains(primary) }) {
            return match
        }
        return categories.first { $0.name == DefaultCategoryKey.other.name }
    }
}
