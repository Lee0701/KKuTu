FROM postgres

COPY db.sql /docker-entrypoint-initdb.d/10-init.sql
COPY cjk_dict_all.sql /docker-entrypoint-initdb.d/10-init-lzh.sql