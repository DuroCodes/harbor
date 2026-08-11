import Foundation

enum HarborFormatters {
    static let currency: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    static let compactCurrency: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter
    }()

    static let mediumDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    static let shortDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter
    }()

    static let relativeSync: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter
    }()

    static func money(_ value: Decimal, compact: Bool = false) -> String {
        let number = NSDecimalNumber(decimal: value)
        let formatter = compact ? compactCurrency : currency
        return formatter.string(from: number) ?? "$0.00"
    }

    static func signedMoney(_ value: Decimal) -> String {
        let formatted = money(abs(value))
        if value > 0 { return "+\(formatted)" }
        if value < 0 { return "-\(money(abs(value)))" }
        return formatted
    }
}
