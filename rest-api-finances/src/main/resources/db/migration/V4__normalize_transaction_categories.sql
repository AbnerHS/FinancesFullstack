CREATE TABLE transaction_categories (
    id RAW(16) DEFAULT SYS_GUID() NOT NULL,
    name VARCHAR2(255 CHAR) NOT NULL,
    CONSTRAINT pk_transaction_categories PRIMARY KEY (id),
    CONSTRAINT uk_transaction_categories_name UNIQUE (name)
);

ALTER TABLE transactions ADD category_id RAW(16);

INSERT INTO transaction_categories (id, name)
SELECT SYS_GUID(), responsibility_tag
FROM (
    SELECT DISTINCT responsibility_tag
    FROM transactions
    WHERE responsibility_tag IS NOT NULL
);

UPDATE transactions t
SET category_id = (
    SELECT c.id
    FROM transaction_categories c
    WHERE c.name = t.responsibility_tag
)
WHERE t.responsibility_tag IS NOT NULL;

ALTER TABLE transactions
    ADD CONSTRAINT fk_transaction_category
    FOREIGN KEY (category_id) REFERENCES transaction_categories(id);
