-- cad_gdp_yoy cambió de fuente (tabla mensual por industria -> tabla
-- trimestral by income and expenditure, ver lección 4 en indicatorsCad.ts)
-- pero años de filas MENSUALES viejas seguían en Supabase. Como el
-- indicador ahora es trimestral, cualquier fila con fecha de un mes que no
-- sea inicio de trimestre (ene/abr/jul/oct) es basura del esquema anterior
-- — y como algunas de esas fechas viejas (ej. 2026-06-01) son más
-- recientes que el punto trimestral correcto (2026-04-01), la tarjeta
-- terminaba mostrando el valor mensual viejo (2.0%) en vez del trimestral
-- (1.13%) que coincide con investing.com.
--
-- Pegar entero en Supabase > SQL Editor > New query > Run.

delete from indicator_overrides
where indicator_id = 'cad_gdp_yoy'
  and extract(month from date) not in (1, 4, 7, 10);
