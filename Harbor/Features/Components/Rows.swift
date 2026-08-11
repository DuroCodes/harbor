import SwiftUI

struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: transaction.category?.systemImage ?? "ellipsis.circle")
                .font(.system(size: 15, weight: .light))
                .foregroundStyle(HarborSurface.labelMuted)
                .frame(width: 28, height: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.displayMerchant)
                    .font(.body.weight(.medium))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                HStack(spacing: 4) {
                    Text(HarborFormatters.shortDate.string(from: transaction.date))
                    if transaction.status == .pending {
                        Text("·")
                        Text("Pending")
                            .foregroundStyle(HarborBrand.accent.opacity(0.85))
                    }
                }
                .font(.caption)
                .foregroundStyle(HarborSurface.labelMuted)
            }

            Spacer(minLength: 8)

            Text(HarborFormatters.signedMoney(transaction.signedAmountForDisplay))
                .font(HarborTypography.amount(.body, weight: .medium))
                .monospacedDigit()
                .foregroundStyle(
                    transaction.signedAmountForDisplay >= 0
                        ? HarborTheme.positive
                        : .white
                )
        }
        .accessibilityElement(children: .combine)
    }
}

struct AccountRow: View {
    let account: Account

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(account.displayName)
                    .font(.subheadline)
                    .foregroundStyle(HarborSurface.labelMuted)
                    .lineLimit(1)
                Text(HarborFormatters.money(account.currentBalance))
                    .font(HarborTypography.amount(.title2))
                    .monospacedDigit()
                    .foregroundStyle(.white)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 4) {
                if let institution = account.institution?.name {
                    Text(institution)
                        .font(.caption2)
                        .foregroundStyle(HarborSurface.labelMuted)
                        .lineLimit(1)
                }
                if let mask = account.mask {
                    Text("••••\(mask)")
                        .font(.caption2)
                        .foregroundStyle(HarborSurface.labelMuted)
                        .monospacedDigit()
                }
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
