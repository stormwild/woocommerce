/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { getVisibleTasks, onboardingStore } from '@woocommerce/data';

/**
 * Internal dependencies
 */
import './progress-header.scss';
import { TaskListMenu } from '~/task-lists/components/task-list-menu';

export type DefaultProgressHeaderProps = {
	taskListId: string;
};

export const DefaultProgressHeader = ( {
	taskListId,
}: DefaultProgressHeaderProps ) => {
	const { loading, tasksCount, completedCount } = useSelect(
		( select ) => {
			const taskList =
				select( onboardingStore ).getTaskList( taskListId );
			const finishedResolution = select(
				onboardingStore
			).hasFinishedResolution( 'getTaskList', [ taskListId ] );
			const visibleTasks = getVisibleTasks( taskList?.tasks || [] );

			return {
				loading: ! finishedResolution,
				tasksCount: visibleTasks?.length,
				completedCount: visibleTasks?.filter(
					( task ) => task.isComplete
				).length,
			};
		},
		[ taskListId ]
	);

	if ( loading ) {
		return null;
	}

	return (
		<div className="woocommerce-task-progress-header">
			<TaskListMenu
				id={ taskListId }
				hideTaskListText={ __( 'Hide setup list', 'woocommerce' ) }
			/>
			<div className="woocommerce-task-progress-header__contents">
				{ completedCount !== tasksCount ? (
					<>
						<p>
							{ sprintf(
								/* translators: 1: completed tasks, 2: total tasks */
								__(
									'Follow these steps to start selling quickly. %1$d out of %2$d complete.',
									'woocommerce'
								),
								completedCount,
								tasksCount
							) }
						</p>
						<progress
							className="woocommerce-task-progress-header__progress-bar"
							max={ tasksCount }
							value={ completedCount || 0.25 }
						/>
					</>
				) : null }
			</div>
		</div>
	);
};
