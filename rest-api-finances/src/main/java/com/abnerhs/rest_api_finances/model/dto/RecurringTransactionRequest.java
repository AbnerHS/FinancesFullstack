package com.abnerhs.rest_api_finances.model.dto;

import com.abnerhs.rest_api_finances.model.Transaction;

public class RecurringTransactionRequest {

    private Transaction transaction;
    private int numberOfPeriods;

    public RecurringTransactionRequest() {
    }

    public RecurringTransactionRequest(Transaction transaction, int numberOfPeriods) {
        this.transaction = transaction;
        this.numberOfPeriods = numberOfPeriods;
    }

    public Transaction getTransaction() {
        return transaction;
    }

    public void setTransaction(Transaction transaction) {
        this.transaction = transaction;
    }

    public int getNumberOfPeriods() {
        return numberOfPeriods;
    }

    public void setNumberOfPeriods(int numberOfPeriods) {
        this.numberOfPeriods = numberOfPeriods;
    }
}