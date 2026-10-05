/**
 * Assign Multiple Users to Job Use Case
 * Assigns one job to multiple users simultaneously and sends notifications.
 */
class AssignMultipleUsersToJob {
  constructor(jobRepository, userRepository, jobAssignmentRepository, createNotification) {
    this.jobRepository = jobRepository;
    this.userRepository = userRepository;
    this.jobAssignmentRepository = jobAssignmentRepository;
    this.createNotification = createNotification;
  }

  async execute(jobId, userIds, assignedBy, notes = null) {
    if (!jobId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('Job ID and user IDs array are required');
    }
    if (!assignedBy) throw new Error('AssignedBy user ID is required');

    // Fetch job + verify assignedBy user in parallel
    const [job, assignedByUser] = await Promise.all([
      this.jobRepository.findById(jobId),
      this.userRepository.findById(assignedBy)
    ]);

    if (!job) throw new Error('Job not found');
    if (!job.canBeAssigned()) throw new Error(`Cannot assign job with status: ${job.status}`);
    if (!assignedByUser) throw new Error('AssignedBy user not found');

    // Verify all target users exist in a single batch query
    const existingUsers = await this.userRepository.prisma.users.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { userId: true }
    });
    const foundUserIds = new Set(existingUsers.map(u => u.userId));
    const invalidUserIds = userIds.filter(id => !foundUserIds.has(id));
    if (invalidUserIds.length > 0) throw new Error(`Invalid user IDs: ${invalidUserIds.join(', ')}`);

    // Batch-assign users (deactivate old, reactivate/create new)
    const assignedCount = await this.jobAssignmentRepository.assignUsersToJob(jobId, userIds, assignedBy, notes);
    job.assignToUsers(userIds);

    // Get summary for response
    const summary = await this.jobAssignmentRepository.getJobAssignmentSummary(jobId);

    // Fire notifications asynchronously — do not block the response
    if (this.createNotification) {
      Promise.all(userIds.map(userId =>
        this.createNotification.execute({
          userId,
          type: 'JOB_ASSIGNED',
          title: 'New Job Assigned',
          message: `You have been assigned to Job #${jobId}`,
          relatedId: jobId,
          relatedType: 'JOB',
          metadata: { jobId, assignedBy, assignmentNotes: notes },
          createdBy: assignedBy
        }).catch(() => {})
      )).catch(() => {});
    }

    return {
      jobId,
      assignedCount,
      totalAssignedUsers: summary.assignedUserCount,
      assignedUserIds: userIds,
      assignedUserNames: summary.assignedUserNames,
      message: `Successfully assigned ${assignedCount} users to job ${jobId}`
    };
  }
}

module.exports = AssignMultipleUsersToJob;