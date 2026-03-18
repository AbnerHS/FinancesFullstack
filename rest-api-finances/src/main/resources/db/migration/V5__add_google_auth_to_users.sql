alter table users
    add column auth_provider varchar(20) not null default 'LOCAL';

alter table users
    add column google_subject varchar(255) unique;

alter table users
    add column email_verified boolean not null default false;
