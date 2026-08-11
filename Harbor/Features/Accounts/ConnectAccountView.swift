import SwiftUI
import SwiftData

struct ConnectAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncService.self) private var syncService

    @State private var coordinator = PlaidLinkCoordinator()
    @State private var statusMessage = "Prepare a link token from your Plaid proxy, then open Link."
    @State private var isLoadingToken = false
    @State private var errorMessage: String?

    private var proxy: PlaidProxyClient { PlaidProxyClient() }

    var body: some View {
        @Bindable var coordinator = coordinator

        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text("Connect an institution through Plaid Sandbox. Your Plaid secret stays on the proxy — never in this app.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if !proxy.isConfigured {
                    ContentUnavailableView(
                        "Proxy Required",
                        systemImage: "server.rack",
                        description: Text("Configure the Plaid proxy URL and API key in Settings before linking accounts.")
                    )
                } else {
                    Text(statusMessage)
                        .font(.body)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await prepareAndOpenLink() }
                    } label: {
                        if isLoadingToken {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text(coordinator.isReady ? "Open Plaid Link" : "Create Link Session")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(isLoadingToken)
                }

                Spacer()
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(HarborSurface.canvas)
            .navigationTitle("Connect Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(HarborSurface.canvas, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .tint(HarborBrand.accent)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .sheet(isPresented: $coordinator.isPresenting) {
                PlaidLinkSheet(session: coordinator.linkSession)
            }
        }
    }

    private func prepareAndOpenLink() async {
        errorMessage = nil
        if coordinator.isReady {
            coordinator.present()
            return
        }

        isLoadingToken = true
        defer { isLoadingToken = false }

        do {
            let response = try await proxy.createLinkToken()
            coordinator.prepare(linkToken: response.linkToken) { result in
                Task { @MainActor in
                    await handleSuccess(result)
                }
            }
            statusMessage = "Link is ready. Continue to choose your institution."
            try? await Task.sleep(for: .milliseconds(400))
            coordinator.present()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func handleSuccess(_ result: LinkConnectionResult) async {
        statusMessage = "Exchanging connection…"
        do {
            try await syncService.connect(
                publicToken: result.publicToken,
                institutionName: result.institutionName,
                institutionID: result.institutionID
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
