CREATE TABLE transaction_categories (
    id BINARY(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT pk_transaction_categories PRIMARY KEY (id),
    CONSTRAINT uk_transaction_categories_name UNIQUE (name)
);

ALTER TABLE transactions ADD category_id BINARY(16);

ALTER TABLE transactions
    ADD CONSTRAINT fk_transaction_category
    FOREIGN KEY (category_id) REFERENCES transaction_categories (id);
