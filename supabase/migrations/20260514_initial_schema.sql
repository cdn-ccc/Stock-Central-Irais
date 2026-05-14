-- ============================================================
-- StockCentral — Schema Completo para Nuevo Proyecto Supabase
-- Ejecutar en: SQL Editor del NUEVO proyecto Supabase
-- Orden: Funciones → Tablas → Índices → Triggers → RLS
-- ============================================================


-- ============================================================
-- PASO 1: FUNCIONES
-- ============================================================

-- NOTA: auth_business_id() se crea DESPUÉS de las tablas (requiere que 'users' exista)

-- Auto-actualiza updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Crea business + usuario público cuando se registra un nuevo auth.user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_full_name TEXT;
  v_business_name TEXT;
  v_business_slug TEXT;
  v_whatsapp TEXT;
  v_final_slug TEXT;
  v_counter INT := 0;
BEGIN
  v_full_name     := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario');
  v_business_name := NEW.raw_user_meta_data->>'business_name';
  v_business_slug := NEW.raw_user_meta_data->>'business_slug';
  v_whatsapp      := NEW.raw_user_meta_data->>'whatsapp_number';

  IF v_business_name IS NULL OR v_business_name = '' THEN
    RETURN NEW;
  END IF;

  v_final_slug := v_business_slug;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM businesses WHERE slug = v_final_slug);
    v_counter := v_counter + 1;
    v_final_slug := v_business_slug || '-' || v_counter;
  END LOOP;

  INSERT INTO businesses (name, slug, whatsapp_number)
  VALUES (v_business_name, v_final_slug, v_whatsapp)
  RETURNING id INTO v_business_id;

  INSERT INTO users (id, business_id, email, full_name, role)
  VALUES (NEW.id, v_business_id, NEW.email, v_full_name, 'admin');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


-- ============================================================
-- PASO 2: TABLAS (orden por dependencias)
-- ============================================================

CREATE TABLE public.businesses (
  id              UUID          DEFAULT gen_random_uuid() NOT NULL,
  name            VARCHAR(200)  NOT NULL,
  slug            VARCHAR(100)  NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  whatsapp_number VARCHAR(20),
  primary_color   VARCHAR(7)    DEFAULT '#6366f1',
  secondary_color VARCHAR(7)    DEFAULT '#8b5cf6',
  status          VARCHAR(20)   DEFAULT 'active',
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now(),
  CONSTRAINT businesses_pkey     PRIMARY KEY (id),
  CONSTRAINT businesses_slug_key UNIQUE (slug)
);

CREATE TABLE public.users (
  id          UUID         NOT NULL,
  business_id UUID         NOT NULL,
  email       VARCHAR(255) NOT NULL,
  full_name   VARCHAR(200) NOT NULL,
  role        VARCHAR(20)  DEFAULT 'admin' NOT NULL,
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMPTZ  DEFAULT now(),
  updated_at  TIMESTAMPTZ  DEFAULT now(),
  CONSTRAINT users_pkey            PRIMARY KEY (id),
  CONSTRAINT users_id_fkey         FOREIGN KEY (id)          REFERENCES auth.users(id)         ON DELETE CASCADE,
  CONSTRAINT users_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE TABLE public.categories (
  id          UUID         DEFAULT gen_random_uuid() NOT NULL,
  business_id UUID         NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT now(),
  updated_at  TIMESTAMPTZ  DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT categories_pkey             PRIMARY KEY (id),
  CONSTRAINT categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE TABLE public.products (
  id              UUID         DEFAULT gen_random_uuid() NOT NULL,
  business_id     UUID         NOT NULL,
  category_id     UUID,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  sku             VARCHAR(50),
  price           NUMERIC      NOT NULL,
  wholesale_price NUMERIC,
  stock           INTEGER      DEFAULT 0 NOT NULL,
  min_stock       INTEGER      DEFAULT 0 NOT NULL,
  status          VARCHAR(20)  DEFAULT 'active' NOT NULL,
  is_featured     BOOLEAN      DEFAULT false,
  created_at      TIMESTAMPTZ  DEFAULT now(),
  updated_at      TIMESTAMPTZ  DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT products_pkey             PRIMARY KEY (id),
  CONSTRAINT products_business_id_fkey  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT products_category_id_fkey  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

CREATE TABLE public.product_images (
  id            UUID        DEFAULT gen_random_uuid() NOT NULL,
  product_id    UUID        NOT NULL,
  url           TEXT        NOT NULL,
  thumbnail_url TEXT,
  sort_order    INTEGER     DEFAULT 0,
  is_primary    BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_images_pkey           PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

CREATE TABLE public.customers (
  id          UUID         DEFAULT gen_random_uuid() NOT NULL,
  business_id UUID         NOT NULL,
  full_name   VARCHAR(200) NOT NULL,
  phone       VARCHAR(20),
  email       VARCHAR(255),
  locality    VARCHAR(200),
  notes       TEXT,
  created_at  TIMESTAMPTZ  DEFAULT now(),
  updated_at  TIMESTAMPTZ  DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT customers_pkey             PRIMARY KEY (id),
  CONSTRAINT customers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE TABLE public.sales (
  id          UUID        DEFAULT gen_random_uuid() NOT NULL,
  business_id UUID        NOT NULL,
  customer_id UUID,
  status      VARCHAR(20) DEFAULT 'pending' NOT NULL,
  subtotal    NUMERIC     DEFAULT 0 NOT NULL,
  discount    NUMERIC     DEFAULT 0 NOT NULL,
  total       NUMERIC     DEFAULT 0 NOT NULL,
  notes       TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT sales_pkey             PRIMARY KEY (id),
  CONSTRAINT sales_business_id_fkey  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT sales_customer_id_fkey  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL,
  CONSTRAINT sales_created_by_fkey   FOREIGN KEY (created_by)  REFERENCES public.users(id)     ON DELETE SET NULL
);

CREATE TABLE public.sale_items (
  id           UUID         DEFAULT gen_random_uuid() NOT NULL,
  sale_id      UUID         NOT NULL,
  product_id   UUID,
  product_name VARCHAR(150) NOT NULL,
  quantity     INTEGER      NOT NULL,
  unit_price   NUMERIC      NOT NULL,
  subtotal     NUMERIC      NOT NULL,
  CONSTRAINT sale_items_pkey           PRIMARY KEY (id),
  CONSTRAINT sale_items_sale_id_fkey    FOREIGN KEY (sale_id)    REFERENCES public.sales(id)    ON DELETE CASCADE,
  CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

CREATE TABLE public.inventory_movements (
  id           UUID        DEFAULT gen_random_uuid() NOT NULL,
  business_id  UUID        NOT NULL,
  product_id   UUID        NOT NULL,
  type         VARCHAR(30) NOT NULL,
  quantity     INTEGER     NOT NULL,
  stock_before INTEGER     NOT NULL,
  stock_after  INTEGER     NOT NULL,
  reference_id UUID,
  notes        TEXT,
  created_by   UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT inventory_movements_pkey            PRIMARY KEY (id),
  CONSTRAINT inventory_movements_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT inventory_movements_product_id_fkey  FOREIGN KEY (product_id)  REFERENCES public.products(id)  ON DELETE CASCADE,
  CONSTRAINT inventory_movements_created_by_fkey  FOREIGN KEY (created_by)  REFERENCES public.users(id)     ON DELETE SET NULL
);


-- ============================================================
-- PASO 3: ÍNDICES
-- ============================================================

CREATE INDEX idx_businesses_slug   ON public.businesses USING btree (slug);
CREATE INDEX idx_businesses_status ON public.businesses USING btree (status);

CREATE INDEX idx_categories_business_id ON public.categories USING btree (business_id);

CREATE INDEX idx_customers_business_id ON public.customers USING btree (business_id);
CREATE INDEX idx_customers_full_name   ON public.customers USING btree (full_name);

CREATE INDEX idx_inventory_movements_business_id ON public.inventory_movements USING btree (business_id);
CREATE INDEX idx_inventory_movements_created_at  ON public.inventory_movements USING btree (created_at);
CREATE INDEX idx_inventory_movements_product_id  ON public.inventory_movements USING btree (product_id);
CREATE INDEX idx_inventory_movements_type        ON public.inventory_movements USING btree (type);

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);

CREATE INDEX        idx_products_business_id    ON public.products USING btree (business_id);
CREATE INDEX        idx_products_category_id    ON public.products USING btree (category_id);
CREATE INDEX        idx_products_status         ON public.products USING btree (status);
CREATE INDEX        idx_products_stock          ON public.products USING btree (stock);
CREATE UNIQUE INDEX idx_products_name_business  ON public.products USING btree (business_id, name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_products_sku_business   ON public.products USING btree (business_id, sku)  WHERE ((sku IS NOT NULL) AND (deleted_at IS NULL));

CREATE INDEX idx_sale_items_product_id ON public.sale_items USING btree (product_id);
CREATE INDEX idx_sale_items_sale_id    ON public.sale_items USING btree (sale_id);

CREATE INDEX idx_sales_business_id ON public.sales USING btree (business_id);
CREATE INDEX idx_sales_created_at  ON public.sales USING btree (created_at);
CREATE INDEX idx_sales_customer_id ON public.sales USING btree (customer_id);
CREATE INDEX idx_sales_status      ON public.sales USING btree (status);

CREATE INDEX idx_users_business_id ON public.users USING btree (business_id);
CREATE INDEX idx_users_email       ON public.users USING btree (email);


-- ============================================================
-- PASO 4: TRIGGERS
-- ============================================================

-- Auto updated_at
CREATE TRIGGER trg_updated_at_businesses
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_customers
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_sales
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de registro: crea business + user al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- PASO 5: FUNCIÓN auth_business_id() — creada aquí porque requiere la tabla users
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_business_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT business_id FROM public.users WHERE id = auth.uid());
END;
$$;


-- ============================================================
-- PASO 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.businesses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- businesses
CREATE POLICY "Public can view active businesses by slug"
  ON public.businesses FOR SELECT TO public
  USING ((status)::text = 'active'::text);

CREATE POLICY "Users can view their own business"
  ON public.businesses FOR SELECT TO public
  USING (id = auth_business_id());

CREATE POLICY "Admins can update their own business"
  ON public.businesses FOR UPDATE TO public
  USING (id = auth_business_id())
  WITH CHECK (id = auth_business_id());

-- users
CREATE POLICY "Allow insert during registration"
  ON public.users FOR INSERT TO public
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view users in their business"
  ON public.users FOR SELECT TO public
  USING (business_id = auth_business_id());

CREATE POLICY "Users can update their own record"
  ON public.users FOR UPDATE TO public
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- categories
CREATE POLICY "Public can view categories of active businesses"
  ON public.categories FOR SELECT TO public
  USING (
    (deleted_at IS NULL) AND
    (business_id IN (SELECT id FROM businesses WHERE (status)::text = 'active'::text))
  );

CREATE POLICY "Users can manage categories in their business"
  ON public.categories FOR ALL TO public
  USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());

-- products
CREATE POLICY "Public can view active products of active businesses"
  ON public.products FOR SELECT TO public
  USING (
    ((status)::text = 'active'::text) AND
    (deleted_at IS NULL) AND
    (business_id IN (SELECT id FROM businesses WHERE (status)::text = 'active'::text))
  );

CREATE POLICY "Users can manage products in their business"
  ON public.products FOR ALL TO public
  USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());

-- product_images
CREATE POLICY "Public can view product images"
  ON public.product_images FOR SELECT TO public
  USING (
    product_id IN (
      SELECT p.id FROM products p
      WHERE ((p.status)::text = 'active'::text)
        AND (p.deleted_at IS NULL)
        AND (p.business_id IN (SELECT id FROM businesses WHERE (status)::text = 'active'::text))
    )
  );

CREATE POLICY "Users can manage images of their products"
  ON public.product_images FOR ALL TO public
  USING (product_id IN (SELECT id FROM products WHERE business_id = auth_business_id()))
  WITH CHECK (product_id IN (SELECT id FROM products WHERE business_id = auth_business_id()));

-- customers
CREATE POLICY "Users can manage customers in their business"
  ON public.customers FOR ALL TO public
  USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());

-- sales
CREATE POLICY "Users can manage sales in their business"
  ON public.sales FOR ALL TO public
  USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());

-- sale_items
CREATE POLICY "Users can manage sale items in their business"
  ON public.sale_items FOR ALL TO public
  USING (sale_id IN (SELECT id FROM sales WHERE business_id = auth_business_id()))
  WITH CHECK (sale_id IN (SELECT id FROM sales WHERE business_id = auth_business_id()));

-- inventory_movements
CREATE POLICY "Users can manage inventory in their business"
  ON public.inventory_movements FOR ALL TO public
  USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());


-- ============================================================
-- ✅ SCHEMA COMPLETO — Listo para usar
-- ============================================================
