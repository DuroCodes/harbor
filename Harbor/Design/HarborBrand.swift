import SwiftUI
import UIKit

/* Hallmark · genre: modern-minimal · theme: custom Harbor dark
 * accent: harbor-teal · paper: true-black
 * display: SF Pro · body: SF Pro · amounts: SF Pro (monospaced digits)
 * mark: anchor · tab home: house
 */

enum HarborBrand {
    static let name = "Harbor"
    static let markSystemImage = "anchor"
    static let homeTabSystemImage = "house"
    static let tagline = "All accounts. One place."

    /// Primary accent — Harbor teal (used sparingly: charts, income, selected chrome).
    static let accent = Color(red: 0.38, green: 0.78, blue: 0.82)
    static let inflow = Color(red: 0.35, green: 0.78, blue: 0.62)
    static let outflowSource = Color(red: 0.55, green: 0.58, blue: 0.62)

    static let expensePalette: [Color] = [
        Color(red: 0.92, green: 0.48, blue: 0.38),
        Color(red: 0.94, green: 0.64, blue: 0.32),
        Color(red: 0.62, green: 0.52, blue: 0.88),
        Color(red: 0.40, green: 0.60, blue: 0.92),
        Color(red: 0.88, green: 0.44, blue: 0.58),
        Color(red: 0.48, green: 0.72, blue: 0.56),
        Color(red: 0.78, green: 0.60, blue: 0.40),
        Color(red: 0.58, green: 0.60, blue: 0.66),
    ]
}

enum HarborSurface {
    /// True black canvas.
    static let canvas = Color.black
    /// Near-black elevated card.
    static let elevated = Color(red: 0.07, green: 0.07, blue: 0.07)
    /// Slightly lifted nested surface.
    static let elevated2 = Color(red: 0.10, green: 0.10, blue: 0.10)
    /// Hairline separators on black.
    static let hairline = Color.white.opacity(0.08)
    static let labelMuted = Color.white.opacity(0.45)
    static let labelSecondary = Color.white.opacity(0.55)
}

enum HarborTypography {
    static func display(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .system(style).weight(weight)
    }

    static func amount(_ style: Font.TextStyle, weight: Font.Weight = .medium) -> Font {
        .system(style).weight(weight)
    }

    /// Oversized hero balance (Robinhood-style).
    static var heroBalance: Font {
        .system(size: 40, weight: .medium, design: .default)
    }
}

struct HarborMark: View {
    var size: CGFloat = 22
    var monochrome: Bool = false

    var body: some View {
        Image(systemName: HarborBrand.markSystemImage)
            .font(.system(size: size, weight: .light))
            .foregroundStyle(monochrome ? Color.white.opacity(0.7) : HarborBrand.accent)
            .accessibilityHidden(true)
    }
}

enum HarborChrome {
    static func applyAppearance() {
        let black = UIColor.black
        let elevated = UIColor(red: 0.07, green: 0.07, blue: 0.07, alpha: 1)
        let teal = UIColor(red: 0.38, green: 0.78, blue: 0.82, alpha: 1)

        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = black
        tab.shadowColor = .clear
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
        UITabBar.appearance().tintColor = teal
        UITabBar.appearance().unselectedItemTintColor = UIColor.white.withAlphaComponent(0.35)

        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = black
        nav.shadowColor = .clear
        nav.titleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold),
        ]
        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
        UINavigationBar.appearance().tintColor = teal

        UITableView.appearance().backgroundColor = black
        UICollectionView.appearance().backgroundColor = black
        UITableViewCell.appearance().backgroundColor = elevated
    }
}
