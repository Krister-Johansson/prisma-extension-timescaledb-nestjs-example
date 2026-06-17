import { Outlet, createFileRoute } from '@tanstack/react-router';

// Layout for a single sensor: the detail (index) and config pages render as
// siblings in this Outlet. Title/breadcrumb come from the child routes.
export const Route = createFileRoute('/sensors/$sensorId')({
  component: () => <Outlet />,
});
