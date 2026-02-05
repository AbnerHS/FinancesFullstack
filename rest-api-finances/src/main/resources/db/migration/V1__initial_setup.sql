create table users
(
    id       raw(16) not null,
    email    varchar2(255 char) not null unique,
    name     varchar2(255 char),
    password varchar2(255 char) not null,
    primary key (id)
);

create table financial_plans
(
    id         raw(16) not null,
    owner_id   raw(16) not null,
    partner_id raw(16),
    name       varchar2(255 char),
    primary key (id)
);

create table financial_periods
(
    id                raw(16) not null,
    month             number(10,0) not null,
    year              number(10,0) not null,
    monthly_balance   number(19,4),
    financial_plan_id raw(16),
    primary key (id)
);

create table transactions
(
    id                  raw(16) not null,
    amount              number(19,4),
    datetime            date,
    period_id           raw(16),
    responsible_user_id raw(16),
    recurring_group_id  raw(16),
    description         varchar2(255 char),
    responsibility_tag  varchar2(255 char),
    type                varchar2(255 char) check (type in ('REVENUE','EXPENSE')),
    primary key (id)
);

create table credit_cards
(
    id      raw(16) not null,
    user_id raw(16) not null,
    name    varchar2(255 char),
    primary key (id)
);

create table credit_card_invoices
(
    id             raw(16) not null,
    amount         number(19,4),
    credit_card_id raw(16) not null,
    period_id      raw(16) not null,
    primary key (id)
);

alter table financial_plans
    add constraint fk_plan_owner foreign key (owner_id) references users;
alter table financial_plans
    add constraint fk_plan_partner foreign key (partner_id) references users;

alter table financial_periods
    add constraint fk_period_plan foreign key (financial_plan_id) references financial_plans;

alter table transactions
    add constraint fk_transaction_period foreign key (period_id) references financial_periods;
alter table transactions
    add constraint fk_transaction_user foreign key (responsible_user_id) references users;

alter table credit_cards
    add constraint fk_card_user foreign key (user_id) references users;

alter table credit_card_invoices
    add constraint fk_invoice_card foreign key (credit_card_id) references credit_cards;
alter table credit_card_invoices
    add constraint fk_invoice_period foreign key (period_id) references financial_periods;