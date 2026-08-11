import Foundation
import LinkKit
import SwiftUI

struct LinkConnectionResult: Sendable {
    let publicToken: String
    let institutionName: String?
    let institutionID: String?
}

/// Owns the LinkKit session lifecycle. Secrets never enter this type — only a short-lived `link_token`.
@MainActor
@Observable
final class PlaidLinkCoordinator {
    private(set) var isReady = false
    var isPresenting = false
    private(set) var lastError: String?
    private(set) var linkSession: PlaidLinkSession?

    private var onSuccess: ((LinkConnectionResult) -> Void)?

    func prepare(linkToken: String, onSuccess: @escaping (LinkConnectionResult) -> Void) {
        self.onSuccess = onSuccess
        lastError = nil
        isReady = false

        let configuration = LinkTokenConfiguration(
            token: linkToken,
            onSuccess: { [weak self] success in
                Task { @MainActor in
                    self?.isPresenting = false
                    let result = LinkConnectionResult(
                        publicToken: success.publicToken,
                        institutionName: success.metadata.institution.name,
                        institutionID: success.metadata.institution.id
                    )
                    self?.onSuccess?(result)
                }
            },
            onExit: { [weak self] exit in
                Task { @MainActor in
                    self?.isPresenting = false
                    if let error = exit.error {
                        self?.lastError = error.errorMessage ?? "Link closed."
                    }
                }
            },
            onEvent: { _ in },
            onLoad: { [weak self] in
                Task { @MainActor in
                    self?.isReady = true
                }
            }
        )

        do {
            linkSession = try Plaid.createPlaidLinkSession(configuration: configuration)
        } catch {
            lastError = "Could not start Plaid Link."
            linkSession = nil
        }
    }

    func present() {
        guard isReady else { return }
        isPresenting = true
    }

    func reset() {
        linkSession = nil
        isReady = false
        isPresenting = false
    }
}

struct PlaidLinkSheet: View {
    let session: PlaidLinkSession?

    var body: some View {
        Group {
            if let session {
                session.sheet()
            } else {
                ProgressView("Connecting…")
                    .padding()
            }
        }
    }
}
