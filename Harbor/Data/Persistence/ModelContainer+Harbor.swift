import Foundation
import SwiftData

enum HarborSchema {
    static var models: [any PersistentModel.Type] {
        [
            Institution.self,
            Account.self,
            Transaction.self,
            Category.self,
            NetWorthSnapshot.self,
            SyncCursor.self,
        ]
    }
}

extension ModelContainer {
    static func harbor(inMemory: Bool = false) throws -> ModelContainer {
        let schema = Schema(HarborSchema.models)
        let configuration = ModelConfiguration(
            isStoredInMemoryOnly: inMemory,
            cloudKitDatabase: .none
        )

        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            // Schema changes (e.g. budgets) can make an existing store unloadable.
            // Wipe the local DB once and recreate so the app can launch again.
            print("Harbor: ModelContainer open failed (\(error)). Resetting local store.")
            try? destroyStore(at: configuration.url)
            return try ModelContainer(for: schema, configurations: [configuration])
        }
    }

    private static func destroyStore(at url: URL) throws {
        let fileManager = FileManager.default
        let candidates = [
            url,
            URL(fileURLWithPath: url.path + "-wal"),
            URL(fileURLWithPath: url.path + "-shm"),
            url.deletingPathExtension().appendingPathExtension("store"),
            url.deletingLastPathComponent().appendingPathComponent("default.store"),
            url.deletingLastPathComponent().appendingPathComponent("default.store-wal"),
            url.deletingLastPathComponent().appendingPathComponent("default.store-shm"),
        ]

        for file in Set(candidates.map(\.path)).map({ URL(fileURLWithPath: $0) }) {
            guard fileManager.fileExists(atPath: file.path) else { continue }
            try fileManager.removeItem(at: file)
        }
    }
}
