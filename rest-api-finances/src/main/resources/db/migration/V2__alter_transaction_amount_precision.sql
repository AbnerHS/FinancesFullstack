-- 1. Adiciona uma coluna temporária com o novo formato
ALTER TABLE transactions ADD (amount_temp NUMBER(19, 5));

-- 2. Copia os dados da coluna antiga para a nova
UPDATE transactions SET amount_temp = amount;

-- 3. Remove a coluna original
ALTER TABLE transactions DROP COLUMN amount;

-- 4. Renomeia a coluna temporária para o nome original
ALTER TABLE transactions RENAME COLUMN amount_temp TO amount;
