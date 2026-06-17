--
-- PostgreSQL database dump
--

\restrict 3vB23LfKOoxcLMGdlMwhdBE6n2RfAwIfyY20w2ldf9tKlfs280DkzOc257e7fsH

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: attendance_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.attendance_method_enum AS ENUM (
    'mobile',
    'sync',
    'manual'
);


ALTER TYPE public.attendance_method_enum OWNER TO postgres;

--
-- Name: leave_request_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.leave_request_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.leave_request_status_enum OWNER TO postgres;

--
-- Name: users_account_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_account_role_enum AS ENUM (
    'admin',
    'employee'
);


ALTER TYPE public.users_account_role_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: check_ins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.check_ins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    work_date date NOT NULL,
    "time" timestamp with time zone NOT NULL,
    latitude double precision,
    longitude double precision,
    method public.attendance_method_enum NOT NULL,
    image_path character varying,
    is_out_of_zone boolean DEFAULT false NOT NULL,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.check_ins OWNER TO postgres;

--
-- Name: check_outs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.check_outs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    work_date date NOT NULL,
    "time" timestamp with time zone NOT NULL,
    latitude double precision,
    longitude double precision,
    method public.attendance_method_enum NOT NULL,
    image_path character varying,
    is_out_of_zone boolean DEFAULT false NOT NULL,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.check_outs OWNER TO postgres;

--
-- Name: employee_code_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_code_seq OWNER TO postgres;

--
-- Name: face_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.face_data (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    list_face_embedding jsonb NOT NULL,
    image_url character varying NOT NULL,
    updated_time timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.face_data OWNER TO postgres;

--
-- Name: geo_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.geo_configs (
    id character varying(32) DEFAULT 'company'::character varying NOT NULL,
    center_lat double precision NOT NULL,
    center_lon double precision NOT NULL,
    radius_meters integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.geo_configs OWNER TO postgres;

--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    status public.leave_request_status_enum DEFAULT 'pending'::public.leave_request_status_enum NOT NULL,
    reviewed_by_id uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leave_requests OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(120) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_code character varying(32) NOT NULL,
    name character varying(120) NOT NULL,
    password_hash character varying NOT NULL,
    account_role public.users_account_role_enum DEFAULT 'employee'::public.users_account_role_enum NOT NULL,
    department character varying(120),
    job_title character varying(120),
    phone character varying(32),
    email character varying(255),
    date_of_birth date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: refresh_tokens PK_7d8bee0204106019488c4c50ffa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);


--
-- Name: shifts PK_84d692e367e4d6cdf045828768c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT "PK_84d692e367e4d6cdf045828768c" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: check_ins PK_check_ins_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT "PK_check_ins_id" PRIMARY KEY (id);


--
-- Name: check_outs PK_check_outs_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_outs
    ADD CONSTRAINT "PK_check_outs_id" PRIMARY KEY (id);


--
-- Name: face_data PK_face_data_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.face_data
    ADD CONSTRAINT "PK_face_data_id" PRIMARY KEY (id);


--
-- Name: geo_configs PK_geo_configs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.geo_configs
    ADD CONSTRAINT "PK_geo_configs" PRIMARY KEY (id);


--
-- Name: leave_requests PK_leave_requests_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "PK_leave_requests_id" PRIMARY KEY (id);


--
-- Name: IDX_3ddc983c5f7bcf132fd8732c3f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON public.refresh_tokens USING btree (user_id);


--
-- Name: IDX_8ae048b57cb451eb306035b1e6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_8ae048b57cb451eb306035b1e6" ON public.users USING btree (employee_code);


--
-- Name: IDX_check_ins_employee_work_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_check_ins_employee_work_date" ON public.check_ins USING btree (employee_id, work_date);


--
-- Name: IDX_check_ins_work_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_check_ins_work_date" ON public.check_ins USING btree (work_date);


--
-- Name: IDX_check_outs_employee_work_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_check_outs_employee_work_date" ON public.check_outs USING btree (employee_id, work_date);


--
-- Name: IDX_check_outs_work_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_check_outs_work_date" ON public.check_outs USING btree (work_date);


--
-- Name: IDX_face_data_employee_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_face_data_employee_id_unique" ON public.face_data USING btree (employee_id);


--
-- Name: IDX_leave_requests_employee_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_leave_requests_employee_dates" ON public.leave_requests USING btree (employee_id, start_date, end_date);


--
-- Name: IDX_leave_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_leave_requests_status" ON public.leave_requests USING btree (status);


--
-- Name: IDX_shifts_active_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_shifts_active_unique" ON public.shifts USING btree (is_active) WHERE (is_active = true);


--
-- Name: refresh_tokens FK_3ddc983c5f7bcf132fd8732c3f4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: check_ins FK_check_ins_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT "FK_check_ins_created_by" FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: check_ins FK_check_ins_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT "FK_check_ins_employee" FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: check_ins FK_check_ins_shift; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_ins
    ADD CONSTRAINT "FK_check_ins_shift" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: check_outs FK_check_outs_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_outs
    ADD CONSTRAINT "FK_check_outs_created_by" FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: check_outs FK_check_outs_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_outs
    ADD CONSTRAINT "FK_check_outs_employee" FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: check_outs FK_check_outs_shift; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.check_outs
    ADD CONSTRAINT "FK_check_outs_shift" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: face_data FK_face_data_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.face_data
    ADD CONSTRAINT "FK_face_data_employee" FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: leave_requests FK_leave_requests_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "FK_leave_requests_employee" FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: leave_requests FK_leave_requests_reviewed_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "FK_leave_requests_reviewed_by" FOREIGN KEY (reviewed_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 3vB23LfKOoxcLMGdlMwhdBE6n2RfAwIfyY20w2ldf9tKlfs280DkzOc257e7fsH

