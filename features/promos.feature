Feature: Carrier promotion eligibility and credit application
  A promo applies only when the plan meets the promo's minimum tier and,
  where required, an eligible trade-in is provided. Credits are applied
  as monthly bill credits over the promo's credit term (plus any instant
  portion); only credits arriving within 24 months count, and the paid
  amount never goes below zero.

  Scenario: A qualifying tier and trade-in earn the promo
    Given 1 line with a new "Galaxy S26 Ultra (256GB)" and an "older" trade-in
    When the scenarios are computed
    Then the "AT&T Extra 2.0" row for "carrier" is a promo row
    And the "AT&T Extra 2.0" row for "carrier" has devices paid of 133.33
    And the "AT&T Extra 2.0" row for "carrier" has credits applied of 733.33
    And the "AT&T Extra 2.0" row for "carrier" has owed at month 24 of 433.33

  Scenario: A plan below the promo's minimum tier gets no promo
    Given 1 line with a new "Galaxy S26 Ultra (256GB)" and an "older" trade-in
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "carrier" is not a promo row
    And the "AT&T Value 2.0" row for "carrier" has devices paid of 866.66

  Scenario: No trade-in means no promo when the promo requires one
    Given 1 line with a new "Galaxy S26 Ultra (256GB)" and no trade-in
    When the scenarios are computed
    Then the "AT&T Extra 2.0" row for "carrier" is not a promo row

  Scenario: Credits larger than 24 months of payments clamp the paid amount at zero
    Given 1 line with a new "iPhone 17 (256GB)" and an "older" trade-in
    When the scenarios are computed
    Then the "T-Mobile Experience Beyond" row for "carrier" is a promo row
    And the "T-Mobile Experience Beyond" row for "carrier" has devices paid of 0.00

  Scenario: An instant portion counts in full and the rest is credited monthly
    Given 1 line with a new "iPhone 17 (256GB)" and a "recent" trade-in
    When the scenarios are computed
    Then the "Verizon Unlimited Ultimate" row for "carrier" is a promo row
    And the "Verizon Unlimited Ultimate" row for "carrier" has credits applied of 1200.00

  Scenario: A promo never applies to a device it does not cover
    Given 1 line with a new "Galaxy S26 (256GB)" and an "older" trade-in
    When the scenarios are computed
    Then the "AT&T Extra 2.0" row for "carrier" is not a promo row
