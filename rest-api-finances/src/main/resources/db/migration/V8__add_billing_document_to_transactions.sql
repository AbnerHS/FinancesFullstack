alter table transactions
    add column billing_document_type varchar(20) null,
    add column billing_document_url varchar(2048) null,
    add column billing_document_file_name varchar(255) null,
    add column billing_document_mime_type varchar(255) null,
    add column billing_document_storage_key varchar(512) null,
    add column billing_document_uploaded_at datetime null;

alter table transactions
    add constraint chk_transaction_billing_document_type
    check (
        billing_document_type is null
            or billing_document_type in ('LINK', 'FILE')
    );
