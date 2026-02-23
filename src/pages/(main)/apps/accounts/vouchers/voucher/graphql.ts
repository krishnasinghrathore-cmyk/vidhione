import { gql } from "@apollo/client";

export const VOUCHER_TYPES = gql`
  query VoucherTypes {
    voucherTypes {
      voucherTypeId
      voucherTypeCode
      displayName
      voucherTypeName
      isVoucherNoAutoFlag
    }
  }
`;

export const MANAGERS = gql`
  query Managers($search: String, $limit: Int) {
    managers(search: $search, limit: $limit) {
      managerId
      name
    }
  }
`;

export const SALESMEN = gql`
  query Salesmen($search: String, $limit: Int) {
    salesmen(search: $search, limit: $limit) {
      salesmanId
      name
    }
  }
`;

export const PAYMENT_VIA_MASTERS = gql`
  query PaymentViaMasters(
    $search: String
    $limit: Int
    $includeInactive: Boolean
  ) {
    paymentViaMasters(
      search: $search
      limit: $limit
      includeInactive: $includeInactive
    ) {
      paymentViaId
      code
      name
      orderNo
      isActive
    }
  }
`;

export const CHEQUE_ISSUE_BOOKS = gql`
  query ChequeIssueBooks($bankLedgerId: Int, $limit: Int) {
    chequeIssueBooks(bankLedgerId: $bankLedgerId, limit: $limit) {
      chequeIssueBookId
      voucherNumber
      voucherDate
      chequeStartNumber
      chequeEndNumber
      remarks
      isCancelledFlag
    }
  }
`;

export const NEXT_VOUCHER_NUMBER = gql`
  query NextVoucherNumber(
    $voucherTypeId: Int!
    $companyFiscalYearId: Int
    $fiscalYearStart: String
    $fiscalYearEnd: String
  ) {
    nextVoucherNumber(
      voucherTypeId: $voucherTypeId
      companyFiscalYearId: $companyFiscalYearId
      fiscalYearStart: $fiscalYearStart
      fiscalYearEnd: $fiscalYearEnd
    )
  }
`;

export const NEXT_CHEQUE_NUMBER_FOR_BOOK = gql`
  query NextChequeNumberForBook($chequeIssueBookId: Int!) {
    nextChequeNumberForBook(chequeIssueBookId: $chequeIssueBookId)
  }
`;

export const LEDGER_CURRENT_BALANCE = gql`
  query LedgerCurrentBalance(
    $ledgerId: Int!
    $toDate: String
    $cancelled: Int
  ) {
    ledgerCurrentBalance(
      ledgerId: $ledgerId
      toDate: $toDate
      cancelled: $cancelled
    ) {
      amount
      drCr
    }
  }
`;

export const LEDGER_SUMMARY_GROUP_LOOKUP = gql`
  query LedgerSummaryGroupLookup($search: String, $limit: Int) {
    ledgerSummaries(
      search: $search
      limit: $limit
      offset: 0
      sortField: "name"
      sortOrder: 1
    ) {
      items {
        ledgerId
        ledgerGroupId
      }
    }
  }
`;

export const INVOICE_ROLLOVER_FOR_RECEIPT_ENTRY = gql`
  query InvoiceRolloverForReceiptEntry(
    $ledgerIds: [Int!]
    $toDate: String
    $removeZeroLines: Int
    $search: String
  ) {
    invoiceRollover(
      ledgerIds: $ledgerIds
      toDate: $toDate
      removeZeroLines: $removeZeroLines
      search: $search
    ) {
      items {
        invoiceId
        invoiceNumber
        invoiceDate
        ledgerId
        ledgerName
        ledgerGroupId
        ledgerGroupName
        difference
        isReceiptRow
      }
    }
  }
`;

export const MONEY_RECEIPT_ISSUE_BOOKS_FOR_SALESMAN = gql`
  query MoneyReceiptIssueBooksForSalesman(
    $input: MoneyReceiptManualBookIssueInput
  ) {
    moneyReceiptManualBookIssueDetail(input: $input) {
      books {
        moneyReceiptIssueBookId
        bookNumber
        receiptStartNumber
        receiptEndNumber
        salesmanId
        voucherDateText
        isCancelled
      }
      entries {
        moneyReceiptIssueBookId
        receiptNumber
        status
        voucherDateText
      }
    }
  }
`;

export const VOUCHER_REGISTER_BY_LEDGER = gql`
  query VoucherRegisterByLedgerDetailed(
    $ledgerId: Int
    $ledgerGroupTypeCodes: [Int!]
    $ledgerDrCrFlag: Int
    $againstLedgerId: Int
    $againstLedgerGroupTypeCodes: [Int!]
    $againstDrCrFlag: Int
    $voucherTypeIds: [Int!]
    $search: String
    $managerId: Int
    $fromDate: String
    $toDate: String
    $cancelled: Int
    $reconciled: Int
    $limit: Int
    $offset: Int
    $pageAfterVoucherDate: String
    $pageAfterVoucherNumber: String
    $pageAfterVoucherId: Int
    $pageBeforeVoucherDate: String
    $pageBeforeVoucherNumber: String
    $pageBeforeVoucherId: Int
    $excludeOpening: Boolean
    $includeSummary: Boolean
    $totalCountHint: Int
  ) {
    voucherRegisterByLedgerDetailed(
      ledgerId: $ledgerId
      ledgerGroupTypeCodes: $ledgerGroupTypeCodes
      ledgerDrCrFlag: $ledgerDrCrFlag
      againstLedgerId: $againstLedgerId
      againstLedgerGroupTypeCodes: $againstLedgerGroupTypeCodes
      againstDrCrFlag: $againstDrCrFlag
      voucherTypeIds: $voucherTypeIds
      search: $search
      managerId: $managerId
      fromDate: $fromDate
      toDate: $toDate
      cancelled: $cancelled
      reconciled: $reconciled
      limit: $limit
      offset: $offset
      pageAfterVoucherDate: $pageAfterVoucherDate
      pageAfterVoucherNumber: $pageAfterVoucherNumber
      pageAfterVoucherId: $pageAfterVoucherId
      pageBeforeVoucherDate: $pageBeforeVoucherDate
      pageBeforeVoucherNumber: $pageBeforeVoucherNumber
      pageBeforeVoucherId: $pageBeforeVoucherId
      excludeOpening: $excludeOpening
      includeSummary: $includeSummary
      totalCountHint: $totalCountHint
    ) {
      items {
        voucherId
        voucherTypeId
        voucherTypeName
        voucherNumber
        voucherDate
        postingDate
        refNo
        refDate
        referenceNumber2
        referenceDate2
        reasonForIssueText
        debitLedgerName
        debitLedgerGroupName
        debitLedgerNames
        debitLedgerAmounts
        creditLedgerName
        creditLedgerNames
        creditLedgerAmounts
        totalNetAmount
        discountAmount
        chequeCancelCharges
        narration
        isCancelledFlag
        isReconciledFlag
        managerId
        managerName
        salesmanName
        sourceKind
        isFullPaidFlag
        totalAmount
        discountAmount
        adjustedAmount
        diffAmount
        chequeCancelCharges
        chequeReturnStatus
        bankName
        branchName
        chequeNo
        chequeDate
        billInvoiceNos
        billInvoiceDates
        billInvoiceAmounts
        primaryLedgerId
        primaryLedgerName
        primaryLedgerGroupName
      }
      totalCount
      totalNetAmount
      totalAmountSum
      discountAmountSum
      adjustedAmountSum
      diffAmountSum
      chequeReturnChargesSum
      chequeReturnCount
    }
  }
`;

export const VOUCHER_REGISTER_BY_LEDGER_COMPAT = gql`
  query VoucherRegisterByLedgerDetailedCompat(
    $ledgerId: Int
    $ledgerGroupTypeCodes: [Int!]
    $ledgerDrCrFlag: Int
    $againstLedgerId: Int
    $againstLedgerGroupTypeCodes: [Int!]
    $againstDrCrFlag: Int
    $voucherTypeIds: [Int!]
    $search: String
    $managerId: Int
    $fromDate: String
    $toDate: String
    $cancelled: Int
    $limit: Int
    $offset: Int
    $pageAfterVoucherDate: String
    $pageAfterVoucherNumber: String
    $pageAfterVoucherId: Int
    $pageBeforeVoucherDate: String
    $pageBeforeVoucherNumber: String
    $pageBeforeVoucherId: Int
    $excludeOpening: Boolean
    $includeSummary: Boolean
    $totalCountHint: Int
  ) {
    voucherRegisterByLedgerDetailed(
      ledgerId: $ledgerId
      ledgerGroupTypeCodes: $ledgerGroupTypeCodes
      ledgerDrCrFlag: $ledgerDrCrFlag
      againstLedgerId: $againstLedgerId
      againstLedgerGroupTypeCodes: $againstLedgerGroupTypeCodes
      againstDrCrFlag: $againstDrCrFlag
      voucherTypeIds: $voucherTypeIds
      search: $search
      managerId: $managerId
      fromDate: $fromDate
      toDate: $toDate
      cancelled: $cancelled
      limit: $limit
      offset: $offset
      pageAfterVoucherDate: $pageAfterVoucherDate
      pageAfterVoucherNumber: $pageAfterVoucherNumber
      pageAfterVoucherId: $pageAfterVoucherId
      pageBeforeVoucherDate: $pageBeforeVoucherDate
      pageBeforeVoucherNumber: $pageBeforeVoucherNumber
      pageBeforeVoucherId: $pageBeforeVoucherId
      excludeOpening: $excludeOpening
      includeSummary: $includeSummary
      totalCountHint: $totalCountHint
    ) {
      items {
        voucherId
        voucherTypeId
        voucherTypeName
        voucherNumber
        voucherDate
        postingDate
        refNo
        refDate
        debitLedgerName
        debitLedgerGroupName
        debitLedgerNames
        debitLedgerAmounts
        creditLedgerName
        creditLedgerNames
        creditLedgerAmounts
        totalNetAmount
        discountAmount
        chequeCancelCharges
        narration
        isCancelledFlag
        managerId
        managerName
      }
      totalCount
      totalNetAmount
    }
  }
`;

export const MONEY_RECEIPT_CASH_BOOK_FALLBACK = gql`
  query MoneyReceiptCashBookFallback($input: MoneyReceiptCashBookInput) {
    moneyReceiptCashBook(input: $input) {
      items {
        voucherNumber
        voucherDateText
        managerName
        salesmanName
        isFullPaid
        totalAmount
        discountAmount
        adjustedAmount
        diffAmount
        chequeCancelCharges
        invoiceNumber
        invoiceDateText
        invoiceAmount
      }
    }
  }
`;

export const MONEY_RECEIPT_BANK_BOOK_FALLBACK = gql`
  query MoneyReceiptBankBookFallback($input: MoneyReceiptBankBookInput) {
    moneyReceiptBankBook(input: $input) {
      items {
        voucherNumber
        voucherDateText
        ledgerName
        otherLedgerName
        bankName
        branchName
        chequeNo
        chequeDateText
        isFullPaid
        chequeReturnStatus
        totalAmount
        discountAmount
        adjustedAmount
        diffAmount
        chequeCancelCharges
        invoiceNumber
        invoiceDateText
        invoiceAmount
      }
    }
  }
`;

export const VOUCHER_ENTRY_BY_ID = gql`
  query VoucherEntryById($voucherId: Int!) {
    voucherEntryById(voucherId: $voucherId) {
      header {
        voucherId
        voucherTypeId
        voucherTypeCode
        voucherTypeName
        voucherNumber
        voucherDate
        postingDate
        refNo
        refDate
        debitLedgerName
        debitLedgerGroupName
        debitLedgerNames
        debitLedgerAmounts
        creditLedgerName
        creditLedgerNames
        creditLedgerAmounts
        totalNetAmount
        discountAmount
        chequeCancelCharges
        narration
        isCancelledFlag
        isReconciledFlag
        reconciliationDate
        managerId
        managerName
        salesmanName
        managerDetails
        managerDetailsAmount
        monthName
        yearMonth
        chequeIssueBookId
        paymentViaId
        primaryLedgerId
        primaryLedgerName
        primaryLedgerGroupName
        primaryLedgerAddress
        chequeInFavourText
        referenceNumber2
        referenceDate2
        reasonForIssueText
        isTaxationFlag
      }
      lines {
        ledgerId
        ledgerName
        ledgerGroupId
        ledgerGroupName
        amount
        drCrFlag
      }
      billDetails {
        voucherBillDetailId
        saleInvoiceId
        invoiceNumber
        invoiceDate
        appliedAmount
        isDebitNoteFlag
      }
    }
  }
`;

export const CREATE_VOUCHER = gql`
  mutation CreateVoucher(
    $voucherTypeId: Int!
    $voucherDateText: String!
    $postingDateText: String
    $voucherNumber: String
    $narrationText: String
    $purchaseVoucherNumber: String
    $purchaseVoucherDateText: String
    $referenceNumber2: String
    $referenceDate2: String
    $reasonForIssueText: String
    $isTaxationFlag: Int
    $managerId: Int
    $chequeInFavourText: String
    $chequeIssueBookId: Int
    $paymentViaId: Int
    $primaryLedgerId: Int
    $isCancelledFlag: Int
    $billDetails: [VoucherBillDetailInput!]
    $lines: [VoucherLineInput!]!
  ) {
    createVoucher(
      voucherTypeId: $voucherTypeId
      voucherDateText: $voucherDateText
      postingDateText: $postingDateText
      voucherNumber: $voucherNumber
      narrationText: $narrationText
      purchaseVoucherNumber: $purchaseVoucherNumber
      purchaseVoucherDateText: $purchaseVoucherDateText
      referenceNumber2: $referenceNumber2
      referenceDate2: $referenceDate2
      reasonForIssueText: $reasonForIssueText
      isTaxationFlag: $isTaxationFlag
      managerId: $managerId
      chequeInFavourText: $chequeInFavourText
      chequeIssueBookId: $chequeIssueBookId
      paymentViaId: $paymentViaId
      primaryLedgerId: $primaryLedgerId
      isCancelledFlag: $isCancelledFlag
      billDetails: $billDetails
      lines: $lines
    ) {
      voucherId
    }
  }
`;

export const UPDATE_VOUCHER = gql`
  mutation UpdateVoucherEntry(
    $voucherId: Int!
    $voucherTypeId: Int!
    $voucherDateText: String!
    $postingDateText: String
    $voucherNumber: String
    $narrationText: String
    $purchaseVoucherNumber: String
    $purchaseVoucherDateText: String
    $referenceNumber2: String
    $referenceDate2: String
    $reasonForIssueText: String
    $isTaxationFlag: Int
    $managerId: Int
    $chequeInFavourText: String
    $chequeIssueBookId: Int
    $paymentViaId: Int
    $primaryLedgerId: Int
    $isCancelledFlag: Int
    $billDetails: [VoucherBillDetailInput!]
    $lines: [VoucherLineInput!]!
  ) {
    updateVoucherEntry(
      voucherId: $voucherId
      voucherTypeId: $voucherTypeId
      voucherDateText: $voucherDateText
      postingDateText: $postingDateText
      voucherNumber: $voucherNumber
      narrationText: $narrationText
      purchaseVoucherNumber: $purchaseVoucherNumber
      purchaseVoucherDateText: $purchaseVoucherDateText
      referenceNumber2: $referenceNumber2
      referenceDate2: $referenceDate2
      reasonForIssueText: $reasonForIssueText
      isTaxationFlag: $isTaxationFlag
      managerId: $managerId
      chequeInFavourText: $chequeInFavourText
      chequeIssueBookId: $chequeIssueBookId
      paymentViaId: $paymentViaId
      primaryLedgerId: $primaryLedgerId
      isCancelledFlag: $isCancelledFlag
      billDetails: $billDetails
      lines: $lines
    )
  }
`;

export const DELETE_VOUCHER = gql`
  mutation DeleteVoucherEntry($voucherId: Int!) {
    deleteVoucherEntry(voucherId: $voucherId)
  }
`;

export const CAN_DELETE_VOUCHER = gql`
  query CanDeleteVoucherEntry($voucherId: Int!) {
    canDeleteVoucherEntry(voucherId: $voucherId) {
      canDelete
      reason
      voucherId
      isReconciledFlag
      isCancelledFlag
      isPostedFlag
      postingLineCount
      receiptMetaCount
      fkConstraintCount
      fkReferenceCount
      fkBlockingReferenceCount
      fkReferenceDetails {
        constraintName
        childSchema
        childTable
        childColumn
        rowCount
        isCleanupHandled
        isConstraintValidated
      }
    }
  }
`;
