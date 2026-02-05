-- 1. Adicionar a coluna para o vínculo com a fatura (Mesmo tipo do UUID do Hibernate)
ALTER TABLE transactions
    ADD credit_card_invoice_id RAW(16);

-- 2. Adicionar a flag de controle
ALTER TABLE transactions
    ADD is_cleared_by_invoice NUMBER(1) DEFAULT 0 NOT NULL;

-- 3. Adicionar a Constraint de Chave Estrangeira
-- Substitua 'credit_card_invoices' pelo nome real da sua tabela de faturas
ALTER TABLE transactions
    ADD CONSTRAINT fk_transaction_invoice
        FOREIGN KEY (credit_card_invoice_id)
            REFERENCES credit_card_invoices(id);

-- 4. Adicionar um índice para performance (muito importante para as somas do Dashboard)
CREATE INDEX idx_trans_invoice_id ON transactions(credit_card_invoice_id);