begin;

with city_seed(name, lat, lng) as (
  values
    ('Бор', 44.0778456::double precision, 22.0991779::double precision),
    ('Вальево', 44.2708719::double precision, 19.8863297::double precision),
    ('Вране', 42.5543511::double precision, 21.8979003::double precision),
    ('Вршац', 45.1200117::double precision, 21.2987880::double precision),
    ('Заечар', 43.9030920::double precision, 22.2785590::double precision),
    ('Зренянин', 45.3802683::double precision, 20.3907614::double precision),
    ('Ягодина', 43.9794256::double precision, 21.2607688::double precision),
    ('Кикинда', 45.8300065::double precision, 20.4653054::double precision),
    ('Кральево', 43.7234519::double precision, 20.6870792::double precision),
    ('Крушевац', 43.5826400::double precision, 21.3264811::double precision),
    ('Лесковац', 42.9951304::double precision, 21.9464271::double precision),
    ('Нови Пазар', 43.1406913::double precision, 20.5180570::double precision),
    ('Панчево', 44.8705686::double precision, 20.6399643::double precision),
    ('Пирот', 43.1547342::double precision, 22.5865039::double precision),
    ('Пожаревац', 44.6199926::double precision, 21.1854000::double precision),
    ('Приштина', 42.6638771::double precision, 21.1640849::double precision),
    ('Прокупле', 43.2343484::double precision, 21.5884422::double precision),
    ('Смедерево', 44.6651048::double precision, 20.9271115::double precision),
    ('Сомбор', 45.7727397::double precision, 19.1147036::double precision),
    ('Сремска Митровица', 44.9701654::double precision, 19.6124132::double precision),
    ('Ужице', 43.8564957::double precision, 19.8402730::double precision),
    ('Чачак', 43.8914332::double precision, 20.3491624::double precision),
    ('Шабац', 44.7571535::double precision, 19.6953972::double precision)
)
insert into cities (name, coordinates)
select city_seed.name, json_build_object('lat', city_seed.lat, 'lng', city_seed.lng)
from city_seed
where not exists (
  select 1
  from cities
  where cities.name = city_seed.name
);

with district_seed(city_name, district_name, sort_order, lat, lng) as (
  values
    ('Бор', 'Центар', 1, 44.0778456::double precision, 22.0991779::double precision),
    ('Вальево', 'Центар', 1, 44.2708719::double precision, 19.8863297::double precision),
    ('Панчево', 'Панчево', 1, 44.8705686::double precision, 20.6399643::double precision),
    ('Панчево', 'Старчево', 2, 44.8100472::double precision, 20.6998149::double precision),
    ('Панчево', 'Качарево', 3, 44.9665856::double precision, 20.6995481::double precision),
    ('Панчево', 'Јабука', 4, 44.9364461::double precision, 20.6656198::double precision),
    ('Панчево', 'Омољица', 5, 44.7607631::double precision, 20.7310487::double precision),
    ('Панчево', 'Долово', 6, 44.9017205::double precision, 20.8772434::double precision),
    ('Панчево', 'Глогоњ', 7, 44.9865352::double precision, 20.5255532::double precision),
    ('Панчево', 'Иваново', 8, 44.7394943::double precision, 20.6971952::double precision),
    ('Панчево', 'Банатско Ново Село', 9, 44.9906809::double precision, 20.7847751::double precision),
    ('Панчево', 'Банатски Брестовац', 10, 44.7266366::double precision, 20.8084452::double precision),
    ('Панчево', 'Војловица', 11, 44.8465709::double precision, 20.6720745::double precision),
    ('Вране', 'Врање', 1, 42.5543511::double precision, 21.8979003::double precision),
    ('Вране', 'Врањска Бања', 2, 42.5469074::double precision, 22.0016973::double precision),
    ('Вршац', 'Центар', 1, 45.1200117::double precision, 21.2987880::double precision),
    ('Заечар', 'Центар', 1, 43.9030920::double precision, 22.2785590::double precision),
    ('Зренянин', 'Центар', 1, 45.3802683::double precision, 20.3907614::double precision),
    ('Ягодина', 'Центар', 1, 43.9794256::double precision, 21.2607688::double precision),
    ('Кикинда', 'Центар', 1, 45.8300065::double precision, 20.4653054::double precision),
    ('Кральево', 'Центар', 1, 43.7234519::double precision, 20.6870792::double precision),
    ('Крушевац', 'Центар', 1, 43.5826400::double precision, 21.3264811::double precision),
    ('Лесковац', 'Центар', 1, 42.9951304::double precision, 21.9464271::double precision),
    ('Нови Пазар', 'Центар', 1, 43.1406913::double precision, 20.5180570::double precision),
    ('Пирот', 'Центар', 1, 43.1547342::double precision, 22.5865039::double precision),
    ('Пожаревац', 'Пожаревац', 1, 44.6199926::double precision, 21.1854000::double precision),
    ('Пожаревац', 'Костолац', 2, 44.7149424::double precision, 21.1710906::double precision),
    ('Приштина', 'Центар', 1, 42.6638771::double precision, 21.1640849::double precision),
    ('Прокупле', 'Центар', 1, 43.2343484::double precision, 21.5884422::double precision),
    ('Смедерево', 'Центар', 1, 44.6651048::double precision, 20.9271115::double precision),
    ('Сомбор', 'Центар', 1, 45.7727397::double precision, 19.1147036::double precision),
    ('Сремска Митровица', 'Центар', 1, 44.9701654::double precision, 19.6124132::double precision),
    ('Ужице', 'Ужице', 1, 43.8564957::double precision, 19.8402730::double precision),
    ('Ужице', 'Севојно', 2, 43.8455418::double precision, 19.8976765::double precision),
    ('Чачак', 'Центар', 1, 43.8914332::double precision, 20.3491624::double precision),
    ('Шабац', 'Центар', 1, 44.7571535::double precision, 19.6953972::double precision)
)
insert into districts (name, city_id, is_active, sort_order, latitude, longitude)
select
  district_seed.district_name,
  cities.id,
  true,
  district_seed.sort_order,
  district_seed.lat::text,
  district_seed.lng::text
from district_seed
join cities on cities.name = district_seed.city_name
where not exists (
  select 1
  from districts
  where districts.name = district_seed.district_name
    and districts.city_id = cities.id
);

commit;
