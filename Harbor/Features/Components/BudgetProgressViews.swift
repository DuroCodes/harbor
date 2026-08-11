import SwiftUI

/// Shared progress rows for the Budgets page and home widget.
struct BudgetProgressList: View {
    let items: [CategoryBudgetProgress]
    var emptyMessage: String = "Set category budgets to track spending."

    var body: some View {
        if items.isEmpty {
            Text(emptyMessage)
                .font(.subheadline)
                .foregroundStyle(HarborSurface.labelMuted)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .harborCard()
        } else {
            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    BudgetProgressRow(item: item)
                    if index < items.count - 1 {
                        HarborHairline(leadingInset: 50)
                    }
                }
            }
            .harborCard(padding: 0)
        }
    }
}

struct BudgetProgressRow: View {
    let item: CategoryBudgetProgress

    private var barColor: Color {
        if item.isOverBudget {
            return HarborBrand.expensePalette[0]
        }
        if item.fractionUsed >= 0.85 {
            return HarborBrand.expensePalette[1]
        }
        return HarborBrand.accent
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                Image(systemName: item.systemImage)
                    .font(.system(size: 15, weight: .light))
                    .foregroundStyle(HarborSurface.labelMuted)
                    .frame(width: 28, height: 28)

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.categoryName)
                        .font(.body.weight(.medium))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(detailText)
                        .font(.caption)
                        .foregroundStyle(HarborSurface.labelMuted)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                Text(statusText)
                    .font(HarborTypography.amount(.body, weight: .medium))
                    .monospacedDigit()
                    .foregroundStyle(item.isOverBudget ? HarborBrand.expensePalette[0] : .white)
                    .lineLimit(1)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(HarborSurface.hairline)
                    Capsule()
                        .fill(barColor)
                        .frame(width: max(4, geo.size.width * min(CGFloat(item.fractionUsed), 1)))
                }
            }
            .frame(height: 4)
            .padding(.leading, 40)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    private var statusText: String {
        if item.isOverBudget {
            return "\(HarborFormatters.money(item.spent - item.limit)) over"
        }
        return "\(HarborFormatters.money(item.remaining)) left"
    }

    private var detailText: String {
        "\(HarborFormatters.money(item.spent)) of \(HarborFormatters.money(item.limit))"
    }
}
