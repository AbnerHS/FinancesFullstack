-- Se estiver no CDB (FREE), precisa disso ou do prefixo C##
ALTER SESSION SET "_ORACLE_SCRIPT" = true;

CREATE USER dev_user IDENTIFIED BY "db314159";
GRANT CONNECT, RESOURCE, DBA TO dev_user;
ALTER USER dev_user QUOTA UNLIMITED ON USERS;