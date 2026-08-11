import Foundation

// MARK: - Proxy request/response DTOs (app ↔ Harbor proxy, not raw Plaid)

struct CreateLinkTokenResponse: Decodable, Sendable {
    let linkToken: String
    let expiration: String?
}

struct ExchangePublicTokenRequest: Encodable, Sendable {
    let publicToken: String
    let institutionName: String?
    let institutionID: String?
}

struct ExchangePublicTokenResponse: Decodable, Sendable {
    let itemID: String
    let accounts: [PlaidAccountDTO]
}

struct SyncItemRequest: Encodable, Sendable {
    let itemID: String
    let cursor: String?
}

struct SyncItemResponse: Decodable, Sendable {
    let accounts: [PlaidAccountDTO]
    let added: [PlaidTransactionDTO]
    let modified: [PlaidTransactionDTO]
    let removed: [PlaidRemovedTransactionDTO]
    let nextCursor: String?
    let hasMore: Bool
}

struct RemoveItemRequest: Encodable, Sendable {
    let itemID: String
}

struct PlaidAccountDTO: Decodable, Sendable {
    let accountID: String
    let name: String
    let officialName: String?
    let type: String
    let subtype: String?
    let mask: String?
    let balances: PlaidBalancesDTO
}

struct PlaidBalancesDTO: Decodable, Sendable {
    let current: Double?
    let available: Double?
    let limit: Double?
    let isoCurrencyCode: String?
}

struct PlaidTransactionDTO: Decodable, Sendable {
    let transactionID: String
    let accountID: String
    let amount: Double
    let isoCurrencyCode: String?
    let date: String
    let authorizedDate: String?
    let name: String
    let merchantName: String?
    let pending: Bool
    let pendingTransactionID: String?
    let personalFinanceCategory: PlaidPFC?
}

struct PlaidPFC: Decodable, Sendable {
    let primary: String?
    let detailed: String?
}

struct PlaidRemovedTransactionDTO: Decodable, Sendable {
    let transactionID: String
}

struct ProxyErrorResponse: Decodable, Sendable {
    let error: String
    let errorCode: String?
}

enum PlaidProxyError: LocalizedError {
    case notConfigured
    case invalidURL
    case httpStatus(Int, String?)
    case decoding
    case serverMessage(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            "Plaid proxy is not configured. Add your proxy URL and API key in Settings."
        case .invalidURL:
            "Invalid proxy URL."
        case .httpStatus(let code, let message):
            message ?? "Proxy request failed (\(code))."
        case .decoding:
            "Could not read proxy response."
        case .serverMessage(let message):
            message
        }
    }
}
