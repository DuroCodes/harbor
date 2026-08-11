import Foundation
import SwiftData
import SwiftUI

@Observable
@MainActor
final class AppServices {
    let sync: SyncService
    let linkCoordinator = PlaidLinkCoordinator()

    init(modelContext: ModelContext) {
        self.sync = SyncService(modelContext: modelContext)
    }
}
