import SwiftUI
import UIKit

enum HarborTheme {
    static let positive = HarborBrand.inflow
    static let negative = Color.white
    static let muted = HarborSurface.labelMuted
    static let accent = HarborBrand.accent
    static let sectionSpacing: CGFloat = 28
    static let cardCorner: CGFloat = 14
    static let rowSpacing: CGFloat = 4

    /// Shared card body height for half-width dashboard tiles
    /// (Assets, This month, Spending pie, Cash flow).
    static let halfTileCardHeight: CGFloat = 120
}

extension View {
    func harborScreen() -> some View {
        self
            .background(HarborSurface.canvas.ignoresSafeArea())
            .toolbarBackground(HarborSurface.canvas, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
    }

    func harborCard(padding: CGFloat = 0) -> some View {
        self
            .padding(padding)
            .background(
                HarborSurface.elevated,
                in: RoundedRectangle(cornerRadius: HarborTheme.cardCorner, style: .continuous)
            )
    }

    func harborListChrome() -> some View {
        self
            .scrollContentBackground(.hidden)
            .background(HarborSurface.canvas)
            .listRowSeparatorTint(HarborSurface.hairline)
    }
}

struct MetricLabel: View {
    let title: String
    let value: String
    var emphasis: Bool = false
    var positive: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(HarborSurface.labelMuted)
            Text(value)
                .font(emphasis ? HarborTypography.amount(.title2) : HarborTypography.amount(.body))
                .monospacedDigit()
                .foregroundStyle(positive ? HarborTheme.positive : .white)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SectionHeader: View {
    let title: String
    var systemImage: String?

    var body: some View {
        HStack(spacing: 6) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(HarborBrand.accent.opacity(0.9))
            }
            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(HarborSurface.labelSecondary)
                .textCase(.none)
        }
    }
}

struct HarborHairline: View {
    var leadingInset: CGFloat = 0

    var body: some View {
        HarborSurface.hairline
            .frame(height: 1 / UIScreen.main.scale)
            .padding(.leading, leadingInset)
    }
}
