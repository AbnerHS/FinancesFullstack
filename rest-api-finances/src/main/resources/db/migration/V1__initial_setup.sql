create table users
(
    id       binary(16) not null,
    email    varchar(255) not null unique,
    name     varchar(255),
    password varchar(255) not null,
    primary key (id)
);

create table financial_plans
(
    id         binary(16) not null,
    owner_id   binary(16) not null,
    partner_id binary(16),
    name       varchar(255),
    primary key (id)
);

create table financial_periods
(
    id                binary(16) not null,
    month             int not null,
    year              int not null,
    monthly_balance   decimal(19,4),
    financial_plan_id binary(16),
    primary key (id)
);

create table transactions
(
    id                  binary(16) not null,
    amount              decimal(19,4),
    datetime            datetime(6),
    period_id           binary(16),
    responsible_user_id binary(16),
    recurring_group_id  binary(16),
    description         varchar(255),
    responsibility_tag  varchar(255),
    type                varchar(255),
    primary key (id)
);

create table credit_cards
(
    id      binary(16) not null,
    user_id binary(16) not null,
    name    varchar(255),
    primary key (id)
);

create table credit_card_invoices
(
    id             binary(16) not null,
    amount         decimal(19,4),
    credit_card_id binary(16) not null,
    period_id      binary(16) not null,
    primary key (id)
);

alter table transactions
    add constraint chk_transaction_type
    check (type in ('REVENUE', 'EXPENSE'));

alter table financial_plans
    add constraint fk_plan_owner foreign key (owner_id) references users (id);
alter table financial_plans
    add constraint fk_plan_partner foreign key (partner_id) references users (id);

alter table financial_periods
    add constraint fk_period_plan foreign key (financial_plan_id) references financial_plans (id);

alter table transactions
    add constraint fk_transaction_period foreign key (period_id) references financial_periods (id);
alter table transactions
    add constraint fk_transaction_user foreign key (responsible_user_id) references users (id);

alter table credit_cards
    add constraint fk_card_user foreign key (user_id) references users (id);

alter table credit_card_invoices
    add constraint fk_invoice_card foreign key (credit_card_id) references credit_cards (id);
alter table credit_card_invoices
    add constraint fk_invoice_period foreign key (period_id) references financial_periods (id);
