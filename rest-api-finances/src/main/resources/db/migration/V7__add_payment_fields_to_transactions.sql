alter table transactions
    add column due_date date null;

alter table transactions
    add column payment_date date null;

alter table transactions
    add column payment_status varchar(20) not null default 'PENDING';

alter table transactions
    add constraint chk_transaction_payment_status
    check (payment_status in ('PENDING', 'PAID'));
