-- R06 ACL correction: remove inherited service-role table privileges.
REVOKE ALL ON TABLE public.event_milestones FROM service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.event_milestones TO service_role;
