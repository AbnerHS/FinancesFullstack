create table financial_plan_partners
(
    plan_id binary(16) not null,
    user_id binary(16) not null,
    primary key (plan_id, user_id)
);

alter table financial_plan_partners
    add constraint fk_plan_partners_plan foreign key (plan_id) references financial_plans (id) on delete cascade;

alter table financial_plan_partners
    add constraint fk_plan_partners_user foreign key (user_id) references users (id);

alter table financial_plans
    add column active_invite_token varchar(64);

create unique index uk_financial_plans_active_invite_token
    on financial_plans (active_invite_token);

insert into financial_plan_partners (plan_id, user_id)
select id, partner_id
from financial_plans
where partner_id is not null;

alter table financial_plans
    drop foreign key fk_plan_partner;

alter table financial_plans
    drop column partner_id;
