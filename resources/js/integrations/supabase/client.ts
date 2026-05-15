import axios from "axios";

const http = axios.create({
  baseURL: "/api",
  withCredentials: true,
  withXSRFToken: true,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

async function csrf() {
  await axios.get("/sanctum/csrf-cookie", { withCredentials: true });
}

function unwrap(response: any) {
  return response?.data?.data ?? response?.data ?? null;
}

function makeSession(me: any) {
  if (!me?.id) return null;

  return {
    user: {
      id: me.id,
      email: me.email,
      role: me.role ?? null,
    },
    access_token: "cookie",
  };
}

function tableEndpoint(table: string) {
  return {
    classes: "/classes",
    students: "/students",
    attendance_records: "/attendance",
    leave_requests: "/leave-requests",
    holidays: "/holidays",
    app_settings: "/settings",
    face_descriptors: "/faces",
    user_roles: "/admin/users",
    student_user_links: "/admin/users",
    parent_student_links: "/admin/users",
  }[table] || `/${table}`;
}

function writeEndpoint(table: string) {
  return table === "holidays" ? "/admin/holidays" : tableEndpoint(table);
}

function flattenLegacyTable(table: string, data: any) {
  const rows = Array.isArray(data) ? data : [];
  if (table === "user_roles") {
    return rows.map((row) => ({ user_id: row.user_id, role: row.role }));
  }
  if (table === "student_user_links") {
    return rows
      .filter((row) => row.role === "student")
      .flatMap((row) => (row.student_ids || []).map((student_id: string, index: number) => ({
        user_id: row.user_id,
        student_id,
        students: { name: row.student_names?.[index] || "-" },
      })));
  }
  if (table === "parent_student_links") {
    return rows
      .filter((row) => row.role === "parent")
      .flatMap((row) => (row.student_ids || []).map((student_id: string, index: number) => ({
        parent_user_id: row.user_id,
        student_id,
        students: { name: row.student_names?.[index] || "-" },
      })));
  }
  return data;
}

function applyLegacyFilters(rows: any[], filters: Record<string, any>, query: Record<string, any>) {
  let filtered = rows;

  for (const [column, value] of Object.entries(filters)) {
    filtered = filtered.filter((row) => row[column] === value);
  }

  if (typeof query.role === "string") {
    const roles = query.role.split(",");
    filtered = filtered.filter((row) => roles.includes(row.role));
  }

  if (typeof query.user_id === "string") {
    const ids = query.user_id.split(",");
    filtered = filtered.filter((row) => ids.includes(row.user_id));
  }

  if (typeof query.parent_user_id === "string") {
    const ids = query.parent_user_id.split(",");
    filtered = filtered.filter((row) => ids.includes(row.parent_user_id));
  }

  return filtered;
}

class QueryBuilder {
  private filters: Record<string, any> = {};
  private query: Record<string, any> = {};
  private payload: any = null;
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private selected = "*";

  constructor(private table: string) {}

  select(columns = "*", options: any = {}) {
    this.selected = columns;
    if (options?.count) this.query.count = options.count;
    if (options?.head) this.query.head = "1";
    return this;
  }

  insert(payload: any) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.op = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  upsert(payload: any) {
    this.op = "upsert";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  neq(column: string, value: any) {
    this.query[`neq_${column}`] = value;
    return this;
  }

  in(column: string, value: any[]) {
    this.query[column] = value.join(",");
    return this;
  }

  gte(column: string, value: any) {
    this.query[column === "date" ? "start_date" : `${column}_gte`] = value;
    return this;
  }

  lte(column: string, value: any) {
    this.query[column === "date" ? "end_date" : `${column}_lte`] = value;
    return this;
  }

  order(column: string, options: any = {}) {
    this.query.order = column;
    this.query.direction = options.ascending === false ? "desc" : "asc";
    return this;
  }

  limit(value: number) {
    this.query.limit = value;
    return this;
  }

  single() {
    return this.execute(true, true);
  }

  maybeSingle() {
    return this.execute(true, false);
  }

  then(resolve: any, reject: any) {
    return this.execute(false, false).then(resolve, reject);
  }

  private async execute(single: boolean, strict: boolean) {
    try {
      const endpoint = tableEndpoint(this.table);
      let data: any = null;
      let count: number | null = null;

      if (this.op === "select") {
        const params = { ...this.query, ...this.filters };
        if (this.table === "user_roles" && this.filters.user_id) {
          const res = await http.get("/auth/me");
          const me = unwrap(res);
          data = me?.id === this.filters.user_id && me?.role
            ? [{ user_id: me.id, role: me.role }]
            : [];
        } else if (this.table === "student_user_links" && this.filters.user_id) {
          const res = await http.get("/auth/me");
          const me = unwrap(res);
          data = me?.id === this.filters.user_id && me?.linked_student_id
            ? [{ user_id: me.id, student_id: me.linked_student_id }]
            : [];
        } else if (this.table === "parent_student_links" && this.filters.parent_user_id) {
          const res = await http.get("/auth/me");
          const me = unwrap(res);
          data = me?.id === this.filters.parent_user_id
            ? (me.parent_student_ids || []).map((student_id: string) => ({ parent_user_id: me.id, student_id }))
            : [];
        } else if (this.table === "app_settings" && this.filters.key) {
          const res = await http.get(endpoint, { params: { key: this.filters.key } });
          data = unwrap(res);
        } else if (this.filters.id && ["students", "attendance_records", "leave_requests", "holidays"].includes(this.table)) {
          const res = await http.get(`${endpoint}/${this.filters.id}`);
          data = unwrap(res);
        } else if (this.query.head === "1") {
          const res = await http.get(endpoint, { params });
          const rows = unwrap(res) || [];
          data = null;
          count = Array.isArray(rows) ? rows.length : 0;
        } else {
          const res = await http.get(endpoint, { params });
          const legacyRows = flattenLegacyTable(this.table, unwrap(res));
          data = Array.isArray(legacyRows) ? applyLegacyFilters(legacyRows, this.filters, this.query) : legacyRows;
        }
      }

      if (this.op === "insert") {
        if (this.table === "students" && Array.isArray(this.payload)) {
          const res = await http.post("/students/import", { rows: this.payload });
          data = unwrap(res);
          return { data, error: null, count: this.payload.length };
        }
        if (this.table === "app_settings") {
          const item = Array.isArray(this.payload) ? this.payload[0] : this.payload;
          const res = await http.put("/admin/settings", { key: item.key, value: item.value });
          data = unwrap(res);
          return { data, error: null, count: null };
        }
        if (this.table === "parent_student_links") {
          const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
          const parentUserId = rows[0]?.parent_user_id;
          const studentIds = rows.map((row: any) => row.student_id);
          const res = await http.patch(`/admin/users/${parentUserId}`, { student_ids: studentIds });
          data = unwrap(res);
          return { data, error: null, count: null };
        }
        if (this.table === "holidays" && Array.isArray(this.payload)) {
          const rows = [];
          for (const item of this.payload) {
            const res = await http.post(writeEndpoint(this.table), item);
            rows.push(unwrap(res));
          }
          data = rows;
          return { data, error: null, count: rows.length };
        }
        const postEndpoint = this.table === "face_descriptors" && this.payload?.student_id
          ? `/students/${this.payload.student_id}/faces`
          : writeEndpoint(this.table);
        const body = this.table === "face_descriptors" && this.payload?.descriptor
          ? { descriptor: this.payload.descriptor }
          : Array.isArray(this.payload) ? this.payload[0] : this.payload;
        const res = await http.post(postEndpoint, body);
        data = unwrap(res);
      }

      if (this.op === "upsert") {
        const res = await http.post(writeEndpoint(this.table), this.payload);
        data = unwrap(res);
      }

      if (this.op === "update") {
        const id = this.filters.id;
        if (this.table === "app_settings" && this.filters.key) {
          const res = await http.put("/admin/settings", { key: this.filters.key, value: this.payload.value ?? this.payload });
          data = unwrap(res);
        } else if (this.table === "attendance_records" && !id && this.filters.student_id && this.filters.date) {
          const lookup = await http.get(endpoint, { params: { student_id: this.filters.student_id, date: this.filters.date } });
          const row = (unwrap(lookup) || [])[0];
          if (!row?.id) throw new Error("Data presensi tidak ditemukan");
          const res = await http.patch(`${endpoint}/${row.id}`, this.payload);
          data = unwrap(res);
        } else {
          const res = await http.patch(`${writeEndpoint(this.table)}/${id}`, this.payload);
          data = unwrap(res);
        }
      }

      if (this.op === "delete") {
        const id = this.filters.id;
        if (this.table === "face_descriptors" && this.filters.student_id) {
          await http.delete(`/students/${this.filters.student_id}/faces`);
        } else if (this.table === "face_descriptors" && !id) {
          await http.delete("/faces");
        } else if (this.table === "attendance_records" && !id && this.filters.student_id && this.filters.date) {
          const lookup = await http.get(endpoint, { params: { student_id: this.filters.student_id, date: this.filters.date } });
          const rows = unwrap(lookup) || [];
          for (const row of rows) {
            if (row?.id) await http.delete(`${endpoint}/${row.id}`);
          }
        } else if (this.table === "parent_student_links" && this.filters.parent_user_id) {
          await http.patch(`/admin/users/${this.filters.parent_user_id}`, { student_ids: [] });
        } else if (this.table === "student_user_links" && this.filters.user_id) {
          data = null;
        } else if (this.table === "user_roles" && this.filters.user_id) {
          await http.delete(`/admin/users/${this.filters.user_id}`);
        } else {
          await http.delete(`${writeEndpoint(this.table)}/${id}`);
        }
        data = null;
      }

      if (Array.isArray(data) && single) {
        data = data[0] ?? null;
      }

      if (strict && !data) {
        return { data: null, error: { message: "Data tidak ditemukan" } };
      }

      return { data, error: null, count };
    } catch (error: any) {
      return { data: null, error: { message: error?.response?.data?.error?.message || error.message }, count: null };
    }
  }
}

export const supabase = {
  auth: {
    onAuthStateChange(callback: any) {
      this.getSession().then(({ data }: any) => callback("INITIAL_SESSION", data.session));
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async getSession() {
      try {
        const res = await http.get("/auth/me");
        const me = unwrap(res);
        return { data: { session: makeSession(me) }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },
    async signInWithPassword(credentials: { email: string; password: string }) {
      try {
        await csrf();
        const res = await http.post("/auth/login", credentials);
        const me = unwrap(res);
        const session = makeSession(me);
        return { data: { session, user: session?.user ?? null }, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error?.response?.data?.error?.message || error.message } };
      }
    },
    async signOut() {
      try {
        await http.post("/auth/logout");
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message } };
      }
    },
    async updateUser(payload: { password?: string }) {
      try {
        await http.post("/auth/password", { password: payload.password });
        return { error: null };
      } catch (error: any) {
        return { error: { message: error?.response?.data?.error?.message || error.message } };
      }
    },
  },
  from(table: string) {
    return new QueryBuilder(table);
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          const form = new FormData();
          form.append("file", file);
          form.append("bucket", bucket);
          form.append("path", path);
          try {
            const res = await http.post("/storage/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
            return { data: unwrap(res), error: null };
          } catch (error: any) {
            return { data: null, error: { message: error?.response?.data?.error?.message || error.message } };
          }
        },
        async remove() {
          return { data: null, error: null };
        },
        getPublicUrl(path: string) {
          if (bucket === "school-assets") {
            return { data: { publicUrl: path.startsWith("/") ? path : `/school-assets/${path}` } };
          }
          return { data: { publicUrl: path } };
        },
        async createSignedUrl(path: string) {
          const res = await http.get("/storage/sign", { params: { path, bucket } });
          return { data: { signedUrl: unwrap(res)?.signedUrl || unwrap(res)?.signed_url }, error: null };
        },
      };
    },
  },
  functions: {
    async invoke(name: string, options: any = {}) {
      try {
        if (name === "create-user-account") {
          const res = await http.post("/admin/users", options.body);
          return { data: unwrap(res), error: null };
        }
        if (name === "manage-user-account") {
          const body = options.body || {};
          if (body.action === "get_email") {
            const res = await http.get(`/admin/users/${body.user_id}`);
            return { data: { email: unwrap(res)?.email }, error: null };
          }
          const res = await http.patch(`/admin/users/${body.user_id}`, body);
          return { data: unwrap(res), error: null };
        }
        return { data: null, error: { message: "Function tidak tersedia" } };
      } catch (error: any) {
        return { data: null, error: { message: error?.response?.data?.error?.message || error.message } };
      }
    },
  },
  channel() {
    return {
      on() { return this; },
      subscribe() { return this; },
    };
  },
  removeChannel() {},
};
