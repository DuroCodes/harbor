import SwiftUI
import SwiftData

/// Manage monthly spending limits per expense category.
struct BudgetsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Category.sortOrder)
    private var categories: [Category]
    @Query(sort: \Transaction.date, order: .reverse)
    private var transactions: [Transaction]

    @State private var editingCategory: Category?

    private var expenseCategories: [Category] {
        categories.filter { !$0.isIncome && !$0.isTransfer }
    }

    private var budgetInputs: [CategoryBudgetInput] {
        expenseCategories.compactMap { category in
            guard let limit = category.monthlyBudgetLimit, limit > 0 else { return nil }
            return CategoryBudgetInput(
                categoryID: category.id.uuidString,
                categoryName: category.name,
                systemImage: category.systemImage,
                monthlyLimit: limit
            )
        }
    }

    private var progress: [CategoryBudgetProgress] {
        FinancialCalculator.categoryBudgetProgress(
            budgets: budgetInputs,
            transactions: transactions.map(Self.input(from:)),
            in: .now
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: HarborTheme.sectionSpacing) {
                if !progress.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("This month")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(HarborSurface.labelSecondary)
                        BudgetProgressList(items: progress)
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Categories")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(HarborSurface.labelSecondary)

                    VStack(spacing: 0) {
                        ForEach(expenseCategories, id: \.id) { category in
                            Button {
                                editingCategory = category
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: category.systemImage)
                                        .font(.system(size: 15, weight: .light))
                                        .foregroundStyle(HarborSurface.labelMuted)
                                        .frame(width: 24, height: 24)

                                    Text(category.name)
                                        .font(.subheadline)
                                        .foregroundStyle(.white)

                                    Spacer(minLength: 8)

                                    if let limit = category.monthlyBudgetLimit, limit > 0 {
                                        Text(HarborFormatters.money(limit))
                                            .font(HarborTypography.amount(.title3))
                                            .monospacedDigit()
                                            .foregroundStyle(HarborBrand.accent)
                                    } else {
                                        Text("Add")
                                            .font(.subheadline)
                                            .foregroundStyle(HarborSurface.labelMuted)
                                    }

                                    Image(systemName: "chevron.right")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(HarborSurface.labelMuted.opacity(0.7))
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            if category.id != expenseCategories.last?.id {
                                HarborHairline(leadingInset: 52)
                            }
                        }
                    }
                    .harborCard(padding: 4)

                    Text("Budgets apply to the current calendar month. Spending matches Cash Flow — transfers excluded, refunds netted.")
                        .font(.caption)
                        .foregroundStyle(HarborSurface.labelMuted)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .harborInlineTitle("Budgets")
        .harborScreen()
        .sheet(isPresented: Binding(
            get: { editingCategory != nil },
            set: { if !$0 { editingCategory = nil } }
        )) {
            if let category = editingCategory {
                BudgetEditorSheet(
                    category: category,
                    initialAmount: category.monthlyBudgetLimit,
                    onSave: { value in
                        saveBudget(for: category, amount: value)
                    },
                    onClear: {
                        clearBudget(for: category)
                    }
                )
                .presentationDetents([.medium])
            }
        }
    }

    private func saveBudget(for category: Category, amount: Decimal?) {
        defer { editingCategory = nil }
        if let amount, amount > 0 {
            category.monthlyBudgetLimit = amount
        } else {
            category.monthlyBudgetLimit = nil
        }
        try? modelContext.save()
    }

    private func clearBudget(for category: Category) {
        category.monthlyBudgetLimit = nil
        try? modelContext.save()
        editingCategory = nil
    }

    private static func input(from transaction: Transaction) -> CashFlowTransactionInput {
        CashFlowTransactionInput(
            amount: transaction.amount,
            date: transaction.date,
            status: transaction.status,
            isIncome: transaction.category?.isIncome ?? false,
            isTransfer: transaction.category?.isTransfer ?? false,
            categoryID: transaction.category?.id.uuidString,
            categoryName: transaction.category?.name,
            categoryImage: transaction.category?.systemImage
        )
    }
}

private struct BudgetEditorSheet: View {
    let category: Category
    let initialAmount: Decimal?
    var onSave: (Decimal?) -> Void
    var onClear: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var amountText = ""

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 12) {
                    Image(systemName: category.systemImage)
                        .font(.title3.weight(.light))
                        .foregroundStyle(HarborBrand.accent)
                    Text(category.name)
                        .font(.title3.weight(.medium))
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Monthly budget")
                        .font(.caption)
                        .foregroundStyle(HarborSurface.labelMuted)
                    TextField("0.00", text: $amountText)
                        .keyboardType(.decimalPad)
                        .font(HarborTypography.amount(.title))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .padding(14)
                        .background(HarborSurface.elevated2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                Spacer()
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(HarborSurface.canvas)
            .navigationTitle("Edit Budget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .tint(HarborBrand.accent)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(parsedAmount)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .tint(HarborBrand.accent)
                }
                ToolbarItem(placement: .bottomBar) {
                    if let initialAmount, initialAmount > 0 {
                        Button("Remove Budget", role: .destructive) {
                            onClear()
                            dismiss()
                        }
                    }
                }
            }
            .toolbarBackground(HarborSurface.canvas, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .onAppear {
                if let initialAmount, initialAmount > 0 {
                    amountText = NSDecimalNumber(decimal: initialAmount).stringValue
                }
            }
        }
    }

    private var parsedAmount: Decimal? {
        let cleaned = amountText
            .replacingOccurrences(of: "$", with: "")
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty, let value = Decimal(string: cleaned), value > 0 else {
            return nil
        }
        return value
    }
}
