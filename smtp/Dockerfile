FROM ubuntu:latest

# Instalando o Postfix
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y postfix

# Configurando o relay para permitir qualquer IP
RUN sed -i '/^mynetworks/d' /etc/postfix/main.cf && \
    echo "mynetworks = 0.0.0.0/0" >> /etc/postfix/main.cf

# Removendo o endereço IP antes da porta em /etc/postfix/master.cf
RUN sed -i 's/\([0-9]\{1,3\}\.\)\{3\}[0-9]\+:\(.*\)/:\2/' /etc/postfix/master.cf

# Removendo a configuração antiga do smtp_bind_address
RUN sed -i '/^smtp_bind_address/d' /etc/postfix/main.cf

# Adicionando a nova configuração smtp_bind_address
RUN echo "smtp_bind_address = 0.0.0.0" >> /etc/postfix/main.cf

RUN sed -i '/^inet_protocols/d' /etc/postfix/main.cf

# Adicionando a nova configuração inet_protocols
RUN echo "inet_protocols = ipv4" >> /etc/postfix/main.cf


# Expondo a porta SMTP
EXPOSE 587

# Comando para iniciar o Postfix
CMD ["sh", "-c", "service postfix start && tail -f /dev/null"]
