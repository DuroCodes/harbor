import Foundation

protocol PlaidProxying: Sendable {
    var isConfigured: Bool { get }
    func createLinkToken() async throws -> CreateLinkTokenResponse
    func exchangePublicToken(_ request: ExchangePublicTokenRequest) async throws -> ExchangePublicTokenResponse
    func syncItem(_ request: SyncItemRequest) async throws -> SyncItemResponse
    func removeItem(_ request: RemoveItemRequest) async throws
}

struct PlaidProxyClient: PlaidProxying {
    var baseURL: URL?
    var apiKey: String?

    init(
        baseURLString: String? = KeychainStore.string(for: .proxyBaseURL),
        apiKey: String? = KeychainStore.string(for: .proxyAPIKey)
    ) {
        if let baseURLString, let url = URL(string: baseURLString) {
            self.baseURL = url
        } else {
            self.baseURL = nil
        }
        self.apiKey = apiKey
    }

    var isConfigured: Bool {
        baseURL != nil && !(apiKey ?? "").isEmpty
    }

    func createLinkToken() async throws -> CreateLinkTokenResponse {
        try await post(path: "/link/token/create", body: EmptyBody())
    }

    func exchangePublicToken(_ request: ExchangePublicTokenRequest) async throws -> ExchangePublicTokenResponse {
        try await post(path: "/item/public_token/exchange", body: request)
    }

    func syncItem(_ request: SyncItemRequest) async throws -> SyncItemResponse {
        try await post(path: "/item/sync", body: request)
    }

    func removeItem(_ request: RemoveItemRequest) async throws {
        let _: EmptyResponse = try await post(path: "/item/remove", body: request)
    }

    private func post<Body: Encodable, Response: Decodable>(
        path: String,
        body: Body
    ) async throws -> Response {
        guard let baseURL, let apiKey, !apiKey.isEmpty else {
            throw PlaidProxyError.notConfigured
        }
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else {
            throw PlaidProxyError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw PlaidProxyError.httpStatus(-1, nil)
        }

        guard (200..<300).contains(http.statusCode) else {
            let message = try? JSONDecoder().decode(ProxyErrorResponse.self, from: data)
            throw PlaidProxyError.httpStatus(http.statusCode, message?.error)
        }

        do {
            return try JSONDecoder().decode(Response.self, from: data)
        } catch {
            throw PlaidProxyError.decoding
        }
    }
}

private struct EmptyBody: Encodable {}
private struct EmptyResponse: Decodable {}
