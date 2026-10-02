-- =====================================================================
-- SmartLar - dados de exemplo
-- Os pedidos passam pelas mesmas regras do sistema: nascem como
-- orçamento via criar_pedido() e avançam de status um passo por vez.
-- As datas são relativas ao dia em que o seed roda.
-- =====================================================================

insert into public.tecnicos (nome, telefone, email, especialidade) values
  ('Lucas Andrade', '(31) 98811-2201', 'lucas@smartlar.com.br', 'Câmeras e sensores'),
  ('Pedro Martins', '(31) 98811-2202', 'pedro@smartlar.com.br', 'Fechaduras e iluminação');

insert into public.produtos (nome, categoria, preco_unitario, descricao) values
  ('Câmera IP Wi-Fi Full HD',        'seguranca',       450.00, 'Câmera 1080p com visão noturna e acesso pelo celular.'),
  ('Sensor de presença',             'seguranca',       180.00, 'Sensor infravermelho sem fio, integra com alarme e iluminação.'),
  ('Fechadura digital biométrica',   'seguranca',      1290.00, 'Abre por digital, senha, cartão ou aplicativo.'),
  ('Lâmpada inteligente RGB',        'iluminacao',       89.90, 'Lâmpada Wi-Fi 10W, 16 milhões de cores, controle por voz.'),
  ('Interruptor inteligente 3 teclas','iluminacao',     249.00, 'Interruptor touch Wi-Fi, substitui o convencional.'),
  ('Fita LED inteligente 5m',        'iluminacao',      159.00, 'Fita RGB com controle por aplicativo.'),
  ('Hub central Zigbee',             'automacao',       399.00, 'Central que conecta e automatiza os dispositivos da casa.'),
  ('Motor para cortina',             'automacao',       890.00, 'Motor silencioso para cortina de trilho, com agendamento.'),
  ('Tomada inteligente',             'automacao',        79.90, 'Liga e desliga aparelhos pelo celular e mede consumo.'),
  ('Echo Dot 5ª geração',            'assistentes_voz', 399.00, 'Assistente de voz Alexa.'),
  ('Google Nest Mini',               'assistentes_voz', 349.00, 'Assistente de voz Google.');

insert into public.clientes (nome, telefone, email, endereco, bairro, observacoes) values
  ('Ana Paula Ribeiro',  '(31) 99123-4501', 'ana.ribeiro@email.com',   'Rua Pernambuco, 1200, apto 802', 'Savassi',         'Prefere contato por WhatsApp à tarde.'),
  ('Carlos Eduardo Lima','(31) 99123-4502', 'carlos.lima@email.com',   'Av. Afonso Pena, 3500, apto 1501','Serra',          null),
  ('Juliana Costa',      '(31) 99123-4503', 'ju.costa@email.com',      'Rua Grão Mogol, 450',            'Sion',            'Casa com portão eletrônico antigo.'),
  ('Marcos Vinícius Souza','(31) 99123-4504', null,                    'Rua Rio Grande do Norte, 880',   'Funcionários',    null),
  ('Fernanda Oliveira',  '(31) 99123-4505', 'fernanda.o@email.com',    'Alameda das Palmeiras, 77',      'Belvedere',       'Condomínio: avisar portaria antes.'),
  ('Roberto Almeida',    '(31) 99123-4506', 'roberto.almeida@email.com','Rua Aimorés, 2100, apto 302',   'Lourdes',         null);

do $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  lucas uuid := (select id from public.tecnicos where nome like 'Lucas%');
  pedro uuid := (select id from public.tecnicos where nome like 'Pedro%');
  p uuid;
begin
  -- 1) Orçamento: exemplo do enunciado -> 2x Câmera (450) + 1x Sensor (180) = R$ 1.080,00
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Ana Paula Ribeiro'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Câmera IP Wi-Fi Full HD'), 'quantidade', 2),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Sensor de presença'), 'quantidade', 1)
    ),
    'Quer monitorar a varanda e a porta de entrada.'
  );

  -- 2) Orçamento
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Carlos Eduardo Lima'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Lâmpada inteligente RGB'), 'quantidade', 6),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Echo Dot 5ª geração'), 'quantidade', 1)
    ),
    'Sala e quartos. Cliente quer controlar tudo por voz.'
  );

  -- 3) Orçamento
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Juliana Costa'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Fechadura digital biométrica'), 'quantidade', 1)
    ),
    'Portão eletrônico antigo, verificar compatibilidade.'
  );

  -- 4) Aprovado (pendente de agendamento)
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Marcos Vinícius Souza'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Hub central Zigbee'), 'quantidade', 1),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Tomada inteligente'), 'quantidade', 4)
    ),
    null, 'pix'
  );
  update public.pedidos set status = 'aprovado' where id = p;

  -- 5) Agendado para amanhã 09:00 (Lucas)
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Fernanda Oliveira'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Câmera IP Wi-Fi Full HD'), 'quantidade', 4),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Sensor de presença'), 'quantidade', 3)
    ),
    'Condomínio: avisar portaria antes.', 'cartao_credito'
  );
  update public.pedidos set status = 'aprovado' where id = p;
  update public.pedidos set status = 'agendado', tecnico_id = lucas,
    data_instalacao = ((hoje + 1) + time '09:00') at time zone 'America/Sao_Paulo' where id = p;

  -- 6) Agendado para amanhã 14:00 (Pedro)
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Roberto Almeida'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Interruptor inteligente 3 teclas'), 'quantidade', 3),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Fita LED inteligente 5m'), 'quantidade', 2)
    ),
    null, 'pix'
  );
  update public.pedidos set status = 'aprovado' where id = p;
  update public.pedidos set status = 'agendado', tecnico_id = pedro,
    data_instalacao = ((hoje + 1) + time '14:00') at time zone 'America/Sao_Paulo' where id = p;

  -- 7) Agendado para daqui a 4 dias (Pedro)
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Ana Paula Ribeiro'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Fechadura digital biométrica'), 'quantidade', 1),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Lâmpada inteligente RGB'), 'quantidade', 2)
    ),
    null, 'boleto'
  );
  update public.pedidos set status = 'aprovado' where id = p;
  update public.pedidos set status = 'agendado', tecnico_id = pedro,
    data_instalacao = ((hoje + 4) + time '10:30') at time zone 'America/Sao_Paulo' where id = p;

  -- 8) Em andamento hoje (Lucas)
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Carlos Eduardo Lima'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Câmera IP Wi-Fi Full HD'), 'quantidade', 2),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Hub central Zigbee'), 'quantidade', 1)
    ),
    null, 'transferencia'
  );
  update public.pedidos set status = 'aprovado' where id = p;
  update public.pedidos set status = 'agendado', tecnico_id = lucas,
    data_instalacao = (hoje + time '08:00') at time zone 'America/Sao_Paulo' where id = p;
  update public.pedidos set status = 'em_andamento' where id = p;

  -- 9) Concluído (Pedro)
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Juliana Costa'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Motor para cortina'), 'quantidade', 2),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Google Nest Mini'), 'quantidade', 1)
    ),
    null, 'pix'
  );
  update public.pedidos set status = 'aprovado' where id = p;
  update public.pedidos set status = 'agendado', tecnico_id = pedro,
    data_instalacao = ((hoje - 1) + time '09:00') at time zone 'America/Sao_Paulo' where id = p;
  update public.pedidos set status = 'em_andamento' where id = p;
  update public.pedidos set status = 'concluido' where id = p;

  -- 10) Concluído (Lucas)
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Fernanda Oliveira'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Sensor de presença'), 'quantidade', 5),
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Echo Dot 5ª geração'), 'quantidade', 2)
    ),
    null, 'cartao_debito'
  );
  update public.pedidos set status = 'aprovado' where id = p;
  update public.pedidos set status = 'agendado', tecnico_id = lucas,
    data_instalacao = ((hoje - 1) + time '15:00') at time zone 'America/Sao_Paulo' where id = p;
  update public.pedidos set status = 'em_andamento' where id = p;
  update public.pedidos set status = 'concluido' where id = p;

  -- 11) Cancelado (direto do orçamento)
  p := public.criar_pedido(
    (select id from public.clientes where nome = 'Marcos Vinícius Souza'),
    jsonb_build_array(
      jsonb_build_object('produto_id', (select id from public.produtos where nome = 'Motor para cortina'), 'quantidade', 3)
    ),
    'Cliente achou caro, vai pensar.'
  );
  update public.pedidos set status = 'cancelado' where id = p;
end;
$$;
