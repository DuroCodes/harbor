import SwiftUI

extension View {
    /// Inline title with dark sticky navigation bar.
    func harborInlineTitle(_ title: String) -> some View {
        self
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
    }

    /// Home-style: empty title — the balance is the hero.
    func harborUntitled() -> some View {
        self
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct HarborHeaderButton: View {
    let systemImage: String
    let accessibilityLabel: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.body.weight(.medium))
        }
        .accessibilityLabel(accessibilityLabel)
        .tint(HarborBrand.accent)
    }
}

struct HarborHeaderMenu<Content: View>: View {
    let systemImage: String
    let accessibilityLabel: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        Menu {
            content()
        } label: {
            Image(systemName: systemImage)
                .font(.body.weight(.medium))
        }
        .accessibilityLabel(accessibilityLabel)
        .tint(HarborBrand.accent)
    }
}
