--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Ubuntu 17.5-1.pgdg24.04+1)
-- Dumped by pg_dump version 17.5 (Ubuntu 17.5-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_status AS ENUM (
    'browser',
    'investor',
    'influencer',
    'admin'
);


ALTER TYPE public.user_status OWNER TO postgres;

--
-- Name: can_user_pledge(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.can_user_pledge(influencer_addr character varying, user_addr character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    influencer_record RECORD;
    existing_pledge RECORD;
BEGIN
    -- Get influencer info
    SELECT * INTO influencer_record 
    FROM influencers 
    WHERE wallet_address = influencer_addr;
    
    -- Check if influencer exists and is in pledging status
    IF NOT FOUND OR influencer_record.status != 'pledging' OR influencer_record.launched_at IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user already has a pledge that hasn't been withdrawn
    SELECT * INTO existing_pledge 
    FROM pledges 
    WHERE user_address = user_addr 
    AND influencer_address = influencer_addr 
    AND has_withdrawn = false;
    
    -- User can pledge if they don't have an existing pledge
    RETURN NOT FOUND;
END;
$$;


ALTER FUNCTION public.can_user_pledge(influencer_addr character varying, user_addr character varying) OWNER TO postgres;

--
-- Name: check_user_permission(character varying, public.user_status); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_user_permission(user_wallet character varying, required_status public.user_status) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    user_current_status user_status;
    status_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    -- Get user's current status
    SELECT status INTO user_current_status
    FROM users
    WHERE wallet_address = user_wallet;
    
    IF user_current_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Define hierarchy levels
    status_hierarchy := CASE user_current_status
        WHEN 'browser' THEN 1
        WHEN 'investor' THEN 2
        WHEN 'influencer' THEN 3
        WHEN 'admin' THEN 4
    END;
    
    required_hierarchy := CASE required_status
        WHEN 'browser' THEN 1
        WHEN 'investor' THEN 2
        WHEN 'influencer' THEN 3
        WHEN 'admin' THEN 4
    END;
    
    -- Admin can access everything, others need exact match or higher
    RETURN status_hierarchy >= required_hierarchy;
END;
$$;


ALTER FUNCTION public.check_user_permission(user_wallet character varying, required_status public.user_status) OWNER TO postgres;

--
-- Name: get_influencer_pledge_stats(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_influencer_pledge_stats(influencer_addr character varying) RETURNS TABLE(total_eth numeric, total_usdc numeric, threshold_eth numeric, threshold_usdc numeric, pledge_count bigint, threshold_met boolean, eth_progress numeric, usdc_progress numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(i.total_pledged_eth, 0),
        COALESCE(i.total_pledged_usdc, 0),
        COALESCE(i.pledge_threshold_eth, 0),
        COALESCE(i.pledge_threshold_usdc, 0),
        COALESCE(i.pledge_count, 0)::BIGINT,
        CASE 
            WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
                 (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
            THEN true 
            ELSE false 
        END,
        CASE 
            WHEN i.pledge_threshold_eth > 0 THEN 
                ROUND((COALESCE(i.total_pledged_eth, 0) / i.pledge_threshold_eth * 100)::numeric, 2)
            ELSE 0 
        END,
        CASE 
            WHEN i.pledge_threshold_usdc > 0 THEN 
                ROUND((COALESCE(i.total_pledged_usdc, 0) / i.pledge_threshold_usdc * 100)::numeric, 2)
            ELSE 0 
        END
    FROM influencers i
    WHERE i.wallet_address = influencer_addr;
END;
$$;


ALTER FUNCTION public.get_influencer_pledge_stats(influencer_addr character varying) OWNER TO postgres;

--
-- Name: get_pledge_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_pledge_stats() RETURNS TABLE(total_influencers integer, active_pledging integer, approved_influencers integer, launched_tokens integer, total_eth_pledged numeric, total_usdc_pledged numeric, total_pledgers integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_influencers,
        COUNT(CASE WHEN i.status = 'pledging' THEN 1 END)::INTEGER as active_pledging,
        COUNT(CASE WHEN i.is_approved = true THEN 1 END)::INTEGER as approved_influencers,
        COUNT(CASE WHEN i.launched_at IS NOT NULL THEN 1 END)::INTEGER as launched_tokens,
        COALESCE(SUM(i.total_pledged_eth), 0) as total_eth_pledged,
        COALESCE(SUM(i.total_pledged_usdc), 0) as total_usdc_pledged,
        (SELECT COUNT(DISTINCT user_address) FROM pledges WHERE has_withdrawn = false)::INTEGER as total_pledgers
    FROM influencers i
    WHERE i.pledge_threshold_eth > 0 OR i.pledge_threshold_usdc > 0;
END;
$$;


ALTER FUNCTION public.get_pledge_stats() OWNER TO postgres;

--
-- Name: log_status_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO user_status_history (user_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.status_updated_by);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_status_change() OWNER TO postgres;

--
-- Name: promote_to_influencer(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.promote_to_influencer(user_wallet character varying, approved_by character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE users 
    SET status = 'influencer', 
        status_updated_by = approved_by,
        status_updated_at = CURRENT_TIMESTAMP
    WHERE wallet_address = user_wallet 
    AND status IN ('browser', 'investor');
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$;


ALTER FUNCTION public.promote_to_influencer(user_wallet character varying, approved_by character varying) OWNER TO postgres;

--
-- Name: promote_to_investor(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.promote_to_investor(user_wallet character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM users WHERE wallet_address = user_wallet;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Only promote if current status is 'browser'
    IF user_record.status = 'browser' THEN
        UPDATE users 
        SET status = 'investor',
            status_updated_by = 'system',
            status_updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = user_wallet;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION public.promote_to_investor(user_wallet character varying) OWNER TO postgres;

--
-- Name: set_default_user_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_default_user_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Always set new users as 'investor' status
    IF NEW.status IS NULL THEN
        NEW.status = 'investor';
    END IF;
    
    -- Set timestamps
    IF TG_OP = 'INSERT' OR (NEW.status != OLD.status) THEN
        NEW.status_updated_at = CURRENT_TIMESTAMP;
        NEW.status_updated_by = COALESCE(NEW.status_updated_by, 'system');
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_default_user_status() OWNER TO postgres;

--
-- Name: track_user_status_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.track_user_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Update status tracking columns
        NEW.status_updated_at = CURRENT_TIMESTAMP;
        NEW.previous_status = OLD.status;
        
        -- Insert into history table
        INSERT INTO user_status_history (user_id, old_status, new_status, changed_by, reason)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.status_updated_by, NULL);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.track_user_status_change() OWNER TO postgres;

--
-- Name: update_influencer_pledge_totals(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_influencer_pledge_totals() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update influencer totals when pledge is added/updated/deleted
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE influencers 
        SET 
            total_pledged_eth = COALESCE((
                SELECT SUM(eth_amount) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ), 0),
            total_pledged_usdc = COALESCE((
                SELECT SUM(usdc_amount) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ), 0),
            pledge_count = COALESCE((
                SELECT COUNT(*) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = NEW.influencer_address;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE influencers 
        SET 
            total_pledged_eth = COALESCE((
                SELECT SUM(eth_amount) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ), 0),
            total_pledged_usdc = COALESCE((
                SELECT SUM(usdc_amount) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ), 0),
            pledge_count = COALESCE((
                SELECT COUNT(*) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = OLD.influencer_address;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_influencer_pledge_totals() OWNER TO postgres;

--
-- Name: update_influencers_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_influencers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_influencers_updated_at() OWNER TO postgres;

--
-- Name: update_pledge_totals(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_pledge_totals() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update influencer totals when pledge is added/updated
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE influencers 
        SET 
            total_pledged_eth = COALESCE((
                SELECT SUM(eth_amount) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ), 0),
            total_pledged_usdc = COALESCE((
                SELECT SUM(usdc_amount) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ), 0),
            pledge_count = COALESCE((
                SELECT COUNT(*) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = NEW.influencer_address;
        
        RETURN NEW;
    END IF;
    
    -- Update influencer totals when pledge is deleted
    IF TG_OP = 'DELETE' THEN
        UPDATE influencers 
        SET 
            total_pledged_eth = COALESCE((
                SELECT SUM(eth_amount) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ), 0),
            total_pledged_usdc = COALESCE((
                SELECT SUM(usdc_amount) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ), 0),
            pledge_count = COALESCE((
                SELECT COUNT(*) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = OLD.influencer_address;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.update_pledge_totals() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: function_count; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.function_count (
    count bigint
);


ALTER TABLE public.function_count OWNER TO postgres;

--
-- Name: influencer_thresholds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.influencer_thresholds (
    id integer NOT NULL,
    influencer_address character varying(42) NOT NULL,
    eth_threshold numeric(18,18) NOT NULL,
    usdc_threshold numeric(18,6) NOT NULL,
    token_name character varying(255) NOT NULL,
    token_symbol character varying(10) NOT NULL,
    influencer_name character varying(255) NOT NULL,
    set_by character varying(42) NOT NULL,
    tx_hash character varying(66),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.influencer_thresholds OWNER TO postgres;

--
-- Name: influencer_thresholds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.influencer_thresholds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.influencer_thresholds_id_seq OWNER TO postgres;

--
-- Name: influencer_thresholds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.influencer_thresholds_id_seq OWNED BY public.influencer_thresholds.id;


--
-- Name: influencers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.influencers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    handle character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    wallet_address character varying(42),
    followers_count integer DEFAULT 0,
    category character varying(100),
    description text,
    avatar_url text,
    verified boolean DEFAULT false,
    status character varying(50) DEFAULT 'pending'::character varying,
    pledge_threshold_eth numeric(20,6) DEFAULT 0,
    pledge_threshold_usdc numeric(20,6) DEFAULT 0,
    total_pledged_eth numeric(20,6) DEFAULT 0,
    total_pledged_usdc numeric(20,6) DEFAULT 0,
    pledge_count integer DEFAULT 0,
    is_approved boolean DEFAULT false,
    approved_at timestamp without time zone,
    launched_at timestamp without time zone,
    token_address character varying(42),
    token_name character varying(255),
    token_symbol character varying(10),
    token_total_supply bigint,
    liquidity_pool_address character varying(42),
    current_price numeric(18,18) DEFAULT 0,
    market_cap numeric(18,2) DEFAULT 0,
    volume_24h numeric(18,2) DEFAULT 0,
    price_change_24h numeric(10,4) DEFAULT 0,
    created_by character varying(42),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_followers CHECK ((followers_count >= 0)),
    CONSTRAINT positive_pledge_amounts CHECK (((pledge_threshold_eth >= (0)::numeric) AND (pledge_threshold_usdc >= (0)::numeric) AND (total_pledged_eth >= (0)::numeric) AND (total_pledged_usdc >= (0)::numeric))),
    CONSTRAINT valid_email CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'::text)),
    CONSTRAINT valid_handle CHECK (((handle)::text ~* '^@[a-zA-Z0-9_]{1,50}$'::text)),
    CONSTRAINT valid_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('active'::character varying)::text, ('pledging'::character varying)::text, ('live'::character varying)::text, ('suspended'::character varying)::text]))),
    CONSTRAINT valid_token_address CHECK (((token_address IS NULL) OR ((token_address)::text ~* '^0x[a-fA-F0-9]{40}$'::text))),
    CONSTRAINT valid_wallet_address CHECK (((wallet_address IS NULL) OR ((wallet_address)::text ~* '^0x[a-fA-F0-9]{40}$'::text)))
);


ALTER TABLE public.influencers OWNER TO postgres;

--
-- Name: influencers_display; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.influencers_display AS
 SELECT id,
    name,
    handle,
    email,
    wallet_address,
    followers_count,
    category,
    description,
    avatar_url,
    verified,
    status,
    pledge_threshold_eth,
    pledge_threshold_usdc,
    total_pledged_eth,
    total_pledged_usdc,
    pledge_count,
    is_approved,
    approved_at,
    launched_at,
    token_address,
    token_name,
    token_symbol,
    token_total_supply,
    liquidity_pool_address,
    current_price,
    market_cap,
    volume_24h,
    price_change_24h,
    created_by,
    notes,
    created_at,
    updated_at,
        CASE
            WHEN (launched_at IS NOT NULL) THEN true
            ELSE false
        END AS is_live,
        CASE
            WHEN (((status)::text = 'live'::text) AND (launched_at IS NOT NULL)) THEN true
            ELSE false
        END AS is_trading
   FROM public.influencers i;


ALTER VIEW public.influencers_display OWNER TO postgres;

--
-- Name: influencers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.influencers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.influencers_id_seq OWNER TO postgres;

--
-- Name: influencers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.influencers_id_seq OWNED BY public.influencers.id;


--
-- Name: pledge_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pledge_events (
    id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    influencer_address character varying(42) NOT NULL,
    user_address character varying(42),
    eth_amount numeric(20,6),
    usdc_amount numeric(20,6),
    tx_hash character varying(66),
    block_number bigint,
    event_data jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.pledge_events OWNER TO postgres;

--
-- Name: pledge_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pledge_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pledge_events_id_seq OWNER TO postgres;

--
-- Name: pledge_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pledge_events_id_seq OWNED BY public.pledge_events.id;


--
-- Name: pledge_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.pledge_summary AS
 SELECT id,
    name,
    handle,
    wallet_address,
    avatar_url,
    followers_count,
    category,
    description,
    verified,
    status,
    pledge_threshold_eth,
    pledge_threshold_usdc,
    total_pledged_eth,
    total_pledged_usdc,
    pledge_count,
    is_approved,
    approved_at,
    launched_at,
    created_at,
        CASE
            WHEN (pledge_threshold_eth > (0)::numeric) THEN round(((total_pledged_eth / pledge_threshold_eth) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS eth_progress_percent,
        CASE
            WHEN (pledge_threshold_usdc > (0)::numeric) THEN round(((total_pledged_usdc / pledge_threshold_usdc) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS usdc_progress_percent,
        CASE
            WHEN (((pledge_threshold_eth > (0)::numeric) AND (total_pledged_eth >= pledge_threshold_eth)) OR ((pledge_threshold_usdc > (0)::numeric) AND (total_pledged_usdc >= pledge_threshold_usdc))) THEN true
            ELSE false
        END AS threshold_met
   FROM public.influencers i
  WHERE ((pledge_threshold_eth > (0)::numeric) OR (pledge_threshold_usdc > (0)::numeric));


ALTER VIEW public.pledge_summary OWNER TO postgres;

--
-- Name: pledges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pledges (
    id integer NOT NULL,
    user_address character varying(42) NOT NULL,
    influencer_address character varying(42) NOT NULL,
    eth_amount numeric(20,6) DEFAULT 0,
    usdc_amount numeric(20,6) DEFAULT 0,
    tx_hash character varying(66),
    block_number bigint,
    has_withdrawn boolean DEFAULT false,
    withdrawn_at timestamp without time zone,
    withdrawn_tx_hash character varying(66),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pledges_amounts_check CHECK (((eth_amount >= (0)::numeric) AND (usdc_amount >= (0)::numeric))),
    CONSTRAINT pledges_min_amount_check CHECK (((eth_amount > (0)::numeric) OR (usdc_amount > (0)::numeric)))
);


ALTER TABLE public.pledges OWNER TO postgres;

--
-- Name: pledges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pledges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pledges_id_seq OWNER TO postgres;

--
-- Name: pledges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pledges_id_seq OWNED BY public.pledges.id;


--
-- Name: trigger_count; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trigger_count (
    count bigint
);


ALTER TABLE public.trigger_count OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    wallet_address character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    display_name character varying(100),
    profile_picture_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    total_invested numeric(15,2) DEFAULT 0.00,
    portfolio_value numeric(15,2) DEFAULT 0.00,
    status public.user_status DEFAULT 'browser'::public.user_status NOT NULL,
    status_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status_updated_by character varying(255),
    previous_status public.user_status,
    firebase_uid character varying(255),
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['investor'::public.user_status, 'influencer'::public.user_status, 'admin'::public.user_status])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'All users in this table have accounts. Browser users are anonymous and not stored here.';


--
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.status IS 'investor=default for all account holders, influencer=admin promoted, admin=admin promoted';


--
-- Name: user_status_distribution; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_status_distribution AS
 SELECT status,
    count(*) AS total_users,
    round((((count(*))::numeric * 100.0) / sum(count(*)) OVER ()), 1) AS percentage,
    string_agg((email)::text, ', '::text ORDER BY created_at DESC) FILTER (WHERE (status = ANY (ARRAY['influencer'::public.user_status, 'admin'::public.user_status]))) AS members
   FROM public.users
  GROUP BY status
  ORDER BY
        CASE status
            WHEN 'admin'::public.user_status THEN 1
            WHEN 'influencer'::public.user_status THEN 2
            WHEN 'investor'::public.user_status THEN 3
            ELSE 4
        END;


ALTER VIEW public.user_status_distribution OWNER TO postgres;

--
-- Name: user_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_status_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    old_status character varying(20),
    new_status character varying(20) NOT NULL,
    changed_by character varying(255),
    reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_status_history OWNER TO postgres;

--
-- Name: user_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_status_history_id_seq OWNER TO postgres;

--
-- Name: user_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_status_history_id_seq OWNED BY public.user_status_history.id;


--
-- Name: user_status_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_status_stats AS
 SELECT status,
    count(*) AS user_count,
    count(
        CASE
            WHEN (created_at > (now() - '7 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS new_this_week,
    count(
        CASE
            WHEN (created_at > (now() - '30 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS new_this_month
   FROM public.users
  GROUP BY status;


ALTER VIEW public.user_status_stats OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: influencer_thresholds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influencer_thresholds ALTER COLUMN id SET DEFAULT nextval('public.influencer_thresholds_id_seq'::regclass);


--
-- Name: influencers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influencers ALTER COLUMN id SET DEFAULT nextval('public.influencers_id_seq'::regclass);


--
-- Name: pledge_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pledge_events ALTER COLUMN id SET DEFAULT nextval('public.pledge_events_id_seq'::regclass);


--
-- Name: pledges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pledges ALTER COLUMN id SET DEFAULT nextval('public.pledges_id_seq'::regclass);


--
-- Name: user_status_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_status_history ALTER COLUMN id SET DEFAULT nextval('public.user_status_history_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: function_count; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.function_count (count) FROM stdin;
2
\.


--
-- Data for Name: influencer_thresholds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.influencer_thresholds (id, influencer_address, eth_threshold, usdc_threshold, token_name, token_symbol, influencer_name, set_by, tx_hash, created_at) FROM stdin;
\.


--
-- Data for Name: influencers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.influencers (id, name, handle, email, wallet_address, followers_count, category, description, avatar_url, verified, status, pledge_threshold_eth, pledge_threshold_usdc, total_pledged_eth, total_pledged_usdc, pledge_count, is_approved, approved_at, launched_at, token_address, token_name, token_symbol, token_total_supply, liquidity_pool_address, current_price, market_cap, volume_24h, price_change_24h, created_by, notes, created_at, updated_at) FROM stdin;
5	Alex Chen	@alexchen	alex@example.com	0x0987654321098765432109876543210987654321	1800000	Technology	Tech entrepreneur and AI researcher sharing insights on innovation.	\N	t	pledging	10.000000	0.000000	124.200000	0.000000	5	f	\N	\N	\N	Alex Chen Token	ALEX	\N	\N	0.000000000000000000	0.00	0.00	0.0000	\N	\N	2025-08-08 23:30:44.403146	2025-08-09 12:20:04.089703
4	Rohini	@rohini	rohananand7272@gmail.com	0x1234567890123456789012345678901234567890	2400000	Crypto	Leading crypto educator and market analyst specializing in blockchain tech.	\N	t	live	5.000000	0.000000	7.500000	0.000000	23	t	2025-07-09 23:30:51.028074	2025-07-24 23:30:51.028074	0x9c742435Cc6634C0532925a3b8D6Ac9C43F533e3	Rohini Token	ROHINI	1000000	\N	0.002400000000000000	2400.00	89234.00	12.4000	\N	\N	2025-08-08 23:30:38.266331	2025-08-09 18:06:07.593173
\.


--
-- Data for Name: pledge_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pledge_events (id, event_type, influencer_address, user_address, eth_amount, usdc_amount, tx_hash, block_number, event_data, created_at) FROM stdin;
1	pledge_made	0x0987654321098765432109876543210987654321	0xf509BE47A85293a70dc0b4Ef3BD5186AE1c5FBa8	1.000000	0.000000	0xeb8459197695a81988cede6e9	18487478	\N	2025-08-08 23:44:18.195849
2	pledge_made	0x0987654321098765432109876543210987654321	0xf509BE47A85293a70dc0b4Ef3BD5186AE1c5FBa8	100.000000	0.000000	0x6da0f3ac1f4d21988d2058ff	18171578	\N	2025-08-09 00:39:24.166632
3	threshold_reached	0x0987654321098765432109876543210987654321	\N	\N	\N	\N	\N	{"total_eth": 104.2, "total_usdc": 0, "threshold_eth": 10, "threshold_usdc": 0, "trigger_pledge_by": "0xf509BE47A85293a70dc0b4Ef3BD5186AE1c5FBa8"}	2025-08-09 00:39:24.166632
35	pledge_made	0x0987654321098765432109876543210987654321	0xf509BE47A85293a70dc0b4Ef3BD5186AE1c5FBa8	10.000000	0.000000	0x2d0f894e31fb21988f971224	18218429	\N	2025-08-09 12:08:19.241653
36	threshold_reached	0x0987654321098765432109876543210987654321	\N	\N	\N	\N	\N	{"total_eth": 114.2, "total_usdc": 0, "threshold_eth": 10, "threshold_usdc": 0, "trigger_pledge_by": "0xf509BE47A85293a70dc0b4Ef3BD5186AE1c5FBa8"}	2025-08-09 12:08:19.241653
37	pledge_made	0x0987654321098765432109876543210987654321	0xf509BE47A85293a70dc0b4Ef3BD5186AE1c5FBa8	10.000000	0.000000	0xd71612ae8c20f81988fa1d355	18873762	\N	2025-08-09 12:20:04.089703
38	threshold_reached	0x0987654321098765432109876543210987654321	\N	\N	\N	\N	\N	{"total_eth": 124.2, "total_usdc": 0, "threshold_eth": 10, "threshold_usdc": 0, "trigger_pledge_by": "0xf509BE47A85293a70dc0b4Ef3BD5186AE1c5FBa8"}	2025-08-09 12:20:04.089703
\.


--
-- Data for Name: pledges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pledges (id, user_address, influencer_address, eth_amount, usdc_amount, tx_hash, block_number, has_withdrawn, withdrawn_at, withdrawn_tx_hash, created_at, updated_at) FROM stdin;
1	0xabc1234567890123456789012345678901234567	0x0987654321098765432109876543210987654321	0.500000	0.000000	\N	\N	f	\N	\N	2025-08-03 23:31:03.024783	2025-08-08 23:31:03.024783
2	0xdef4567890123456789012345678901234567890	0x0987654321098765432109876543210987654321	1.000000	0.000000	\N	\N	f	\N	\N	2025-08-04 23:31:03.024783	2025-08-08 23:31:03.024783
3	0x1111111111111111111111111111111111111111	0x0987654321098765432109876543210987654321	0.750000	0.000000	\N	\N	f	\N	\N	2025-08-05 23:31:03.024783	2025-08-08 23:31:03.024783
4	0x2222222222222222222222222222222222222222	0x0987654321098765432109876543210987654321	0.950000	0.000000	\N	\N	f	\N	\N	2025-08-06 23:31:03.024783	2025-08-08 23:31:03.024783
5	0xf509BE47A85293a70dc0b4Ef3BD5186AE1c5FBa8	0x0987654321098765432109876543210987654321	121.000000	0.000000	0xd71612ae8c20f81988fa1d355	18873762	f	\N	\N	2025-08-08 23:44:18.195849	2025-08-09 12:20:04.089703
\.


--
-- Data for Name: trigger_count; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trigger_count (count) FROM stdin;
3
\.


--
-- Data for Name: user_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_status_history (id, user_id, old_status, new_status, changed_by, reason, created_at) FROM stdin;
1	1	browser	admin	system	\N	2025-08-07 17:19:13.989762
2	2	browser	investor	\N	\N	2025-08-07 17:25:29.589344
3	4	browser	investor	\N	\N	2025-08-07 17:25:29.589344
4	15	investor	influencer	admin-script	\N	2025-08-09 11:56:32.052492
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, wallet_address, email, display_name, profile_picture_url, created_at, updated_at, is_active, total_invested, portfolio_value, status, status_updated_at, status_updated_by, previous_status, firebase_uid) FROM stdin;
4	2VLT6Q9tg8VCiIEcJOMG6NyEpu73	arjitanand1114@gmail.com	arjitanand1114	\N	2025-08-07 16:19:40.233387-04	2025-08-07 17:25:29.589344-04	t	0.00	0.00	investor	2025-08-07 17:01:14.623751	\N	\N	\N
2	SayrIZ9d7LTE68I5jRayf4Nj1CK2	riceinyoursink@gmail.com	Rice InYourSink	https://lh3.googleusercontent.com/a/ACg8ocJJWN90L55TgQT3M3AnsrydABuk5QsjgfYNw_VFrzPjKnqXbg=s96-c	2025-08-07 16:18:32.924796-04	2025-08-08 13:56:41.213518-04	t	0.00	0.00	investor	2025-08-07 17:01:14.623751	\N	\N	SayrIZ9d7LTE68I5jRayf4Nj1CK2
15	n8rS4IU2x3UKuXufM0umqJnj8OC2	rohananand7272@gmail.com	rohan anand	https://lh3.googleusercontent.com/a/ACg8ocIORJ9MYAILpH4-uzq7ZtpzJyCDCIZko6gFjyyKf0TdufJVk016=s96-c	2025-08-09 11:56:17.258851-04	2025-08-09 18:06:30.390333-04	t	0.00	0.00	influencer	2025-08-09 11:56:32.052492	admin-script	\N	n8rS4IU2x3UKuXufM0umqJnj8OC2
1	H9Kg2zzoYVSE9PgUsjKCmKH6zwK2	vihananand2010@gmail.com	vihan anand	https://lh3.googleusercontent.com/a/ACg8ocKqA3vjVEpTyiVDGpzZtCGBcIUlJbTD2JFF2RjRuVZ7YcKLLppT=s96-c	2025-08-07 16:15:45.849703-04	2025-08-09 20:37:32.564777-04	t	0.00	0.00	admin	2025-08-07 17:19:13.989762	system	\N	H9Kg2zzoYVSE9PgUsjKCmKH6zwK2
14	fQUMcjdMEGQTKvxq8s00JGGvjo03	cadenaedson02@gmail.com	caden	https://lh3.googleusercontent.com/a/ACg8ocL0d5u8CzdykFOC4zPC4P1JRun6r6LLjAhkeEBHFtGHa0l3BA=s96-c	2025-08-08 14:53:35.57268-04	2025-08-08 14:53:35.57268-04	t	0.00	0.00	investor	2025-08-08 14:53:35.57268	system	\N	fQUMcjdMEGQTKvxq8s00JGGvjo03
\.


--
-- Name: influencer_thresholds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.influencer_thresholds_id_seq', 1, false);


--
-- Name: influencers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.influencers_id_seq', 6, true);


--
-- Name: pledge_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pledge_events_id_seq', 38, true);


--
-- Name: pledges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pledges_id_seq', 40, true);


--
-- Name: user_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_status_history_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 15, true);


--
-- Name: influencer_thresholds influencer_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influencer_thresholds
    ADD CONSTRAINT influencer_thresholds_pkey PRIMARY KEY (id);


--
-- Name: influencers influencers_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influencers
    ADD CONSTRAINT influencers_email_key UNIQUE (email);


--
-- Name: influencers influencers_handle_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influencers
    ADD CONSTRAINT influencers_handle_key UNIQUE (handle);


--
-- Name: influencers influencers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influencers
    ADD CONSTRAINT influencers_pkey PRIMARY KEY (id);


--
-- Name: influencers influencers_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influencers
    ADD CONSTRAINT influencers_wallet_address_key UNIQUE (wallet_address);


--
-- Name: pledge_events pledge_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pledge_events
    ADD CONSTRAINT pledge_events_pkey PRIMARY KEY (id);


--
-- Name: pledges pledges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pledges
    ADD CONSTRAINT pledges_pkey PRIMARY KEY (id);


--
-- Name: pledges pledges_user_influencer_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pledges
    ADD CONSTRAINT pledges_user_influencer_unique UNIQUE (user_address, influencer_address);


--
-- Name: user_status_history user_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_status_history
    ADD CONSTRAINT user_status_history_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_wallet_address_key UNIQUE (wallet_address);


--
-- Name: idx_influencer_thresholds_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencer_thresholds_address ON public.influencer_thresholds USING btree (influencer_address);


--
-- Name: idx_influencers_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_approved ON public.influencers USING btree (is_approved);


--
-- Name: idx_influencers_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_category ON public.influencers USING btree (category);


--
-- Name: idx_influencers_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_created_at ON public.influencers USING btree (created_at);


--
-- Name: idx_influencers_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_email ON public.influencers USING btree (email);


--
-- Name: idx_influencers_followers_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_followers_count ON public.influencers USING btree (followers_count DESC);


--
-- Name: idx_influencers_handle; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_handle ON public.influencers USING btree (handle);


--
-- Name: idx_influencers_market_cap; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_market_cap ON public.influencers USING btree (market_cap DESC);


--
-- Name: idx_influencers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_status ON public.influencers USING btree (status);


--
-- Name: idx_influencers_token_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_token_address ON public.influencers USING btree (token_address);


--
-- Name: idx_influencers_verified; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_verified ON public.influencers USING btree (verified);


--
-- Name: idx_influencers_wallet; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_wallet ON public.influencers USING btree (wallet_address);


--
-- Name: idx_influencers_wallet_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_influencers_wallet_address ON public.influencers USING btree (wallet_address);


--
-- Name: idx_pledge_events_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledge_events_created_at ON public.pledge_events USING btree (created_at);


--
-- Name: idx_pledge_events_influencer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledge_events_influencer ON public.pledge_events USING btree (influencer_address);


--
-- Name: idx_pledge_events_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledge_events_type ON public.pledge_events USING btree (event_type);


--
-- Name: idx_pledges_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledges_created_at ON public.pledges USING btree (created_at);


--
-- Name: idx_pledges_influencer_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledges_influencer_address ON public.pledges USING btree (influencer_address);


--
-- Name: idx_pledges_user_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledges_user_address ON public.pledges USING btree (user_address);


--
-- Name: idx_pledges_withdrawn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pledges_withdrawn ON public.pledges USING btree (has_withdrawn);


--
-- Name: idx_user_status_history_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_status_history_created_at ON public.user_status_history USING btree (created_at);


--
-- Name: idx_user_status_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_status_history_user_id ON public.user_status_history USING btree (user_id);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_firebase_uid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_firebase_uid ON public.users USING btree (firebase_uid);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_wallet_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_wallet_address ON public.users USING btree (wallet_address);


--
-- Name: pledges pledge_totals_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER pledge_totals_trigger AFTER INSERT OR DELETE OR UPDATE ON public.pledges FOR EACH ROW EXECUTE FUNCTION public.update_pledge_totals();


--
-- Name: influencers trigger_update_influencers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_influencers_updated_at BEFORE UPDATE ON public.influencers FOR EACH ROW EXECUTE FUNCTION public.update_influencers_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users user_status_change_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER user_status_change_trigger AFTER UPDATE OF status ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_status_change();


--
-- Name: users user_status_default_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER user_status_default_trigger BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_default_user_status();


--
-- Name: user_status_history user_status_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_status_history
    ADD CONSTRAINT user_status_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO token_app;


--
-- Name: TABLE function_count; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.function_count TO token_app;


--
-- Name: TABLE influencer_thresholds; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.influencer_thresholds TO token_app;


--
-- Name: SEQUENCE influencer_thresholds_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.influencer_thresholds_id_seq TO token_app;


--
-- Name: TABLE influencers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.influencers TO token_app;


--
-- Name: TABLE influencers_display; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.influencers_display TO token_app;


--
-- Name: SEQUENCE influencers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.influencers_id_seq TO token_app;


--
-- Name: TABLE pledge_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pledge_events TO token_app;


--
-- Name: SEQUENCE pledge_events_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pledge_events_id_seq TO token_app;


--
-- Name: TABLE pledge_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pledge_summary TO token_app;


--
-- Name: TABLE pledges; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pledges TO token_app;


--
-- Name: SEQUENCE pledges_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pledges_id_seq TO token_app;


--
-- Name: TABLE trigger_count; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.trigger_count TO token_app;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.users TO token_app;


--
-- Name: TABLE user_status_distribution; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_status_distribution TO token_app;


--
-- Name: TABLE user_status_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_status_history TO token_app;


--
-- Name: SEQUENCE user_status_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.user_status_history_id_seq TO token_app;


--
-- Name: TABLE user_status_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_status_stats TO token_app;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO token_app;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO token_app;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO token_app;


--
-- PostgreSQL database dump complete
--

