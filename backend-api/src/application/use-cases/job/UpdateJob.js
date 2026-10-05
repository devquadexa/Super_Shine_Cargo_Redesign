/**
 * Update Job Use Case
 * Updates job details like BL Number, CUSDEC Number, LC Number, Container Number, Transporter.
 */
class UpdateJob {
  constructor(jobRepository) {
    this.jobRepository = jobRepository;
  }

  /**
   * Safely parses a date string. Returns null for empty/invalid values.
   */
  _parseDate(value) {
    if (value === undefined || value === null || value === '') return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) throw new Error(`Invalid date format: ${value}`);
    return d;
  }

  async execute(jobId, jobData) {
    if (!jobId) throw new Error('Job ID is required');
    if (!jobData || typeof jobData !== 'object') throw new Error('Invalid job data provided');

    const existingJob = await this.jobRepository.findById(jobId);
    if (!existingJob) throw new Error(`Job with ID ${jobId} not found`);

    // Parse dates (throws on malformed values)
    const processedOpenDate = jobData.openDate !== undefined
      ? this._parseDate(jobData.openDate)
      : existingJob.openDate;

    const processedCusdecDate = jobData.cusdecDate !== undefined
      ? this._parseDate(jobData.cusdecDate)
      : existingJob.cusdecDate;

    const processedTransportDeliveryDate = jobData.transportDeliveryDate !== undefined
      ? this._parseDate(jobData.transportDeliveryDate)
      : existingJob.transportDeliveryDate;

    // Merge incoming data onto existing values (only override defined fields)
    const updatedJob = {
      jobId: existingJob.jobId,
      customerId: existingJob.customerId,
      blNumber:              jobData.blNumber              !== undefined ? (jobData.blNumber || null)              : existingJob.blNumber,
      cusdecNumber:          jobData.cusdecNumber          !== undefined ? (jobData.cusdecNumber || null)          : existingJob.cusdecNumber,
      cusdecDate:            processedCusdecDate,
      openDate:              processedOpenDate,
      shipmentCategory:      jobData.shipmentCategory      !== undefined ? jobData.shipmentCategory                : existingJob.shipmentCategory,
      chassisNumber:         jobData.chassisNumber         !== undefined ? (jobData.chassisNumber || null)         : existingJob.chassisNumber,
      exporter:              jobData.exporter              !== undefined ? (jobData.exporter || null)              : existingJob.exporter,
      lcNumber:              jobData.lcNumber              !== undefined ? (jobData.lcNumber || null)              : existingJob.lcNumber,
      containerNumber:       jobData.containerNumber       !== undefined ? (jobData.containerNumber || null)       : existingJob.containerNumber,
      transporter:           jobData.transporter           !== undefined ? (jobData.transporter || null)           : existingJob.transporter,
      transportDeliveryDate: processedTransportDeliveryDate,
      status:                (jobData.status != null)                    ? jobData.status                          : existingJob.status
    };

    if (!updatedJob.customerId) throw new Error('Customer ID is required');
    if (!updatedJob.shipmentCategory) throw new Error('Shipment Category is required');

    const result = await this.jobRepository.update(jobId, updatedJob);
    return result || updatedJob;
  }
}

module.exports = UpdateJob;
