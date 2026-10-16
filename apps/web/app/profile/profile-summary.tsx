import type { ReactNode, Ref } from "react";
import Image from "next/image";
import { GraduationCapIcon } from "@phosphor-icons/react/dist/csr/GraduationCap";
import { BookOpenIcon } from "@phosphor-icons/react/dist/csr/BookOpen";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { MapPinIcon } from "@phosphor-icons/react/dist/csr/MapPin";

export function ProfileSummary({
  name,
  hometown,
  bio,
  campus,
  major,
  graduationYear,
  verified,
  headingRef,
  nameBadge,
}: {
  name: string;
  hometown?: string | null;
  bio: string;
  campus: string;
  major: string;
  graduationYear: number | null;
  verified?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  nameBadge?: ReactNode;
}) {
  const isUncChapelHill =
    campus === "University of North Carolina at Chapel Hill" ||
    campus === "UNC–Chapel Hill" ||
    campus === "UNC-Chapel Hill" ||
    campus === "UNC Chapel Hill";
  const school = isUncChapelHill ? "UNC Chapel Hill" : campus;
  return (
    <div className="profile-summary">
      <div className="profile-title-row">
        <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
          {name}
          {nameBadge}
        </h1>
        {verified && isUncChapelHill && (
          <Image
            className="profile-school-logo"
            src="/brand/schools/unc-chapel-hill.png"
            alt="UNC Chapel Hill school logo"
            width={768}
            height={601}
            unoptimized
          />
        )}
      </div>
      <dl className="profile-facts">
        <div>
          <GraduationCapIcon aria-hidden="true" />
          <dt>School:</dt>
          <dd>{school}</dd>
        </div>
        {major && (
          <div>
            <BookOpenIcon aria-hidden="true" />
            <dt>Major:</dt>
            <dd>{major}</dd>
          </div>
        )}
        {graduationYear && (
          <div>
            <CalendarBlankIcon aria-hidden="true" />
            <dt>Class:</dt>
            <dd>{graduationYear}</dd>
          </div>
        )}
        {hometown && (
          <div>
            <MapPinIcon aria-hidden="true" />
            <dt>Hometown:</dt>
            <dd>{hometown}</dd>
          </div>
        )}
      </dl>
      {bio && <p className="profile-bio">{bio}</p>}
    </div>
  );
}
