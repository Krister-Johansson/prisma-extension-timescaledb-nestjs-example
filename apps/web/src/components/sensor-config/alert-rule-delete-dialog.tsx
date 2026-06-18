import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { removeAlertRuleFromCache } from '@/data/alert-rule-cache';
import { DeleteAlertRuleDocument } from '@/graphql/alert-rules.generated';

/**
 * Controlled delete confirmation for a sensor's alert rule. Owns the optimistic
 * deleteAlertRule mutation — the rule disappears immediately and reappears if
 * the request fails.
 */
export function AlertRuleDeleteDialog({
  sensorId,
  ruleId,
  open,
  onOpenChange,
}: {
  sensorId: string;
  ruleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [deleteAlertRule, { loading }] = useMutation(DeleteAlertRuleDocument);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this alert rule?</AlertDialogTitle>
          <AlertDialogDescription>
            The sensor will stop raising alerts until you add a new rule. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              void deleteAlertRule({
                variables: { sensorId },
                optimisticResponse: {
                  deleteAlertRule: {
                    __typename: 'AlertRule',
                    id: ruleId,
                    sensorId,
                  },
                },
                update: (cache) =>
                  removeAlertRuleFromCache(cache, sensorId, ruleId),
                onCompleted: () => {
                  onOpenChange(false);
                  toast.success('Alert rule deleted');
                },
              }).catch(() => {});
            }}
            className="bg-alert text-white hover:bg-alert/90"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
